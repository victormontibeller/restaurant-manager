package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Escolha;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.catalogo.dtos.Grupo;
import br.com.restaurantmanager.catalogo.dtos.Opcao;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class FinanceiroTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private PedidosCenario p;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void prepararCenario() throws Exception {
        p = new PedidosCenario(mvc, mapper);
    }

    @AfterEach
    void limpar() throws Exception {
        p.close();
    }

    @Test
    void cancelarUmComboExtingueSomenteRemanescenteDaUnidadeCompleta() throws Exception {
        var grupo = UUID.randomUUID();
        var opcao = UUID.randomUUID();
        var categoria = p.c.categoria("Combos");
        var combo = p.c.produto(categoria, "Combo completo", List.of(), List.of(new Grupo(grupo, "Escolha", 1, 1,
                List.of(new Opcao(opcao, p.produto.id(), "10.00", 1, List.of())))));
        p.c.ofertar(combo.id(), UNIDADE, "30.00", true);
        var linha = new Linha(UUID.randomUUID(), combo.id(), 2, List.of(), List.of(new Escolha(grupo, opcao, 1, List.of())));
        var pedido = p.enviar(p.entrada(List.of(linha), CanalAtendimento.RETIRADA, null));
        List<UUID> ids = p.unidades(pedido);
        assertThat(pedido.get("saldo").get("totalDevido").asText()).isEqualTo("80.00");
        // Estado financeiro anterior controlado: ajuste de R$10 e devolução já confirmada.
        p.c.executar("update " + p.c.schema + ".cobranca set pago_confirmado=80,devolvido_confirmado=10");
        p.c.executar("update " + p.c.schema + ".cobranca_parcela set abatido=10 where unidade_producao_id='" + ids.getFirst() + "'");
        assertThat(p.acao(pedido, "cancelar", p.c.token, List.of(opcao)).getStatus()).isEqualTo(409);
        pedido = p.acao(pedido, "cancelar", List.of(ids.getFirst()));
        var saldo = p.detalhe(pedido).get("saldo");
        assertThat(saldo.get("totalDevido").asText()).isEqualTo("40.00");
        assertThat(saldo.get("saldoADevolver").asText()).isEqualTo("30.00");
        try (var conexao = p.banco(); var sql = conexao.createStatement();
                var resultado = sql.executeQuery("select valor from " + p.c.schema + ".ajuste_cobranca")) {
            assertThat(resultado.next()).isTrue();
            assertThat(resultado.getBigDecimal(1)).isEqualByComparingTo("30.00");
            assertThat(resultado.next()).isFalse();
        }
        assertThat(p.detalhe(pedido).get("linhas").get(0).get("quantidade").asInt()).isEqualTo(2);
    }

    @Test
    void cancelamentoIntegralIncluiTaxaFicticiaSemCobrarOuDevolverEmDuplicidade() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        String id = pedido.get("id").asText();
        p.c.executar("insert into " + p.c.schema + ".cobranca_parcela(id,cobranca_id,pedido_id,tipo,original) select '"
                + UUID.randomUUID() + "',id,'" + id + "','TAXA',5 from " + p.c.schema + ".cobranca");
        p.c.executar("update " + p.c.schema + ".cobranca set pago_confirmado=25,pendencia_financeira=true");
        pedido = p.acao(pedido, "cancelar", List.of());
        var saldo = p.detalhe(pedido).get("saldo");
        assertThat(saldo.get("totalDevido").asText()).isEqualTo("0.00");
        assertThat(saldo.get("saldoADevolver").asText()).isEqualTo("25.00");
        assertThat(saldo.get("pendenciaFinanceira").asBoolean()).isTrue();
        assertThat(p.contar("ajuste_cobranca")).isEqualTo(2);
    }
}
