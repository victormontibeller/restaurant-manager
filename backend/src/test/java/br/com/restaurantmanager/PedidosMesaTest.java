package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Calcular;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.catalogo.dtos.Produto;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class PedidosMesaTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private MesasCenario m;
    private Produto produto;
    private UUID comanda;
    private String participante;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void prepararCenario() throws Exception {
        m = new MesasCenario(mvc, mapper);
        produto = m.base.produto(m.base.categoria("Mesa"), "Lanche da mesa", List.of(), List.of());
        m.base.ofertar(produto.id(), UNIDADE, "20.00", true);
        m.base.executar("update " + m.base.schema + ".produto_unidade set mesa=true");
        var atendimento = m.abrir();
        comanda = m.comanda(atendimento);
        participante = m.token(m.autorizar(atendimento));
    }

    @AfterEach
    void limpar() throws Exception {
        m.close();
    }

    @Test
    void rodadaVaiDiretoCozinhaCompartilhaCobrancaEProibeAutoriaAlheia() throws Exception {
        var pedido = enviar();
        assertThat(pedido.get("estado").asText()).isEqualTo("NA_FILA");
        assertThat(pedido.get("alertarEm").isNull()).isTrue();
        assertThat(pedido.get("expirarEm").isNull()).isTrue();
        enviar();
        assertThat(m.base.contar("pedido_deadline_trabalho")).isZero();
        assertThat(m.base.contar("cobranca")).isEqualTo(1);
        assertThat(m.base.contar("pedido")).isEqualTo(2);
        String cliente = m.base.login(m.base.usuario("CLIENTE"));
        assertThat(m.base.enviar("GET", "/api/v1/me/pedidos/" + pedido.get("id").asText(), cliente, null).getStatus()).isEqualTo(404);
        var assistido = m.base.enviar("POST", "/api/v1/operacao/pedidos", m.base.token, entrada());
        assertThat(assistido.getStatus()).isEqualTo(200);
        assertThat(m.base.enviar("GET", "/api/v1/mesa/pedidos/" + m.base.json(assistido).get("id").asText(), participante, null).getStatus()).isEqualTo(404);
    }

    @Test
    void fechamentoBloqueiaRodadaMasPermiteAutocancelarEEncerraQuandoSaldoZero() throws Exception {
        var pedido = enviar();
        var pendente = entrada();
        var fechar = m.estado(comanda, "iniciar-fechamento", 0);
        assertThat(fechar.getStatus()).isEqualTo(200);
        assertThat(m.base.enviar("POST", "/api/v1/mesa/pedidos", participante, pendente).getStatus()).isEqualTo(409);
        assertThat(m.estado(comanda, "concluir", 1).getStatus()).isEqualTo(409);
        var cancelado = m.base.enviar("POST", "/api/v1/mesa/pedidos/" + pedido.get("id").asText() + "/cancelar", participante,
                new ComandoPedido(UUID.randomUUID(), 0, "Desistência fictícia", List.of()));
        assertThat(cancelado.getStatus()).isEqualTo(200);
        assertThat(m.estado(comanda, "concluir", 1).getStatus()).isEqualTo(200);
        assertThat(m.base.enviar("GET", "/api/v1/mesa/pedidos", participante, null).getStatus()).isEqualTo(401);
    }

    @Test
    void mesaPodeSerServidaComSaldoDevidoMasNaoPodeFechar() throws Exception {
        var pedido = enviar();
        String id = pedido.get("id").asText();
        UUID unidade = UUID.fromString(pedido.get("unidades").get(0).get("id").asText());
        for (String acao : List.of("iniciar", "concluir")) {
            var resposta = m.base.enviar("POST", "/api/v1/cozinha/pedidos/" + id + "/" + acao, m.base.token,
                    new ComandoPedido(UUID.randomUUID(), pedido.get("versao").asLong(), "", List.of(unidade)));
            assertThat(resposta.getStatus()).isEqualTo(200);
            pedido = m.base.json(resposta);
        }
        var servido = m.base.enviar("POST", "/api/v1/operacao/pedidos/" + id + "/servir", m.base.token,
                new ComandoPedido(UUID.randomUUID(), pedido.get("versao").asLong(), "", List.of()));
        assertThat(servido.getStatus()).isEqualTo(200);
        assertThat(m.base.json(servido).get("estado").asText()).isEqualTo("CONCLUIDO");
        assertThat(m.estado(comanda, "iniciar-fechamento", 0).getStatus()).isEqualTo(200);
        assertThat(m.estado(comanda, "concluir", 1).getStatus()).isEqualTo(409);
    }

    @Test
    void rodadaConcorrenteComFechamentoNuncaPassaDepoisDaComandaBloqueada() throws Exception {
        var entrada = entrada();
        var resultados = PedidosConcorrenciaTest.disputar(
                () -> m.base.enviar("POST", "/api/v1/mesa/pedidos", participante, entrada).getStatus(),
                () -> m.estado(comanda, "iniciar-fechamento", 0).getStatus());
        assertThat(resultados.get(1)).isEqualTo(200);
        assertThat(resultados.getFirst()).isIn(200, 409);
        assertThat(m.base.contar("pedido")).isEqualTo(resultados.getFirst() == 200 ? 1 : 0);
        var nova = entrada();
        assertThat(m.base.enviar("POST", "/api/v1/mesa/pedidos", participante, nova).getStatus()).isEqualTo(409);
    }

    private JsonNode enviar() throws Exception {
        var resposta = m.base.enviar("POST", "/api/v1/mesa/pedidos", participante, entrada());
        assertThat(resposta.getStatus()).as(resposta.getContentAsString()).isEqualTo(200);
        return m.base.json(resposta);
    }

    private EnviarPedido entrada() throws Exception {
        var linhas = List.of(new Linha(UUID.randomUUID(), produto.id(), 1, List.of(), List.of()));
        var quote = m.base.enviar("POST", "/api/v1/carrinho/calcular", null, new Calcular(UNIDADE, CanalAtendimento.MESA, linhas, null));
        assertThat(quote.getStatus()).isEqualTo(200);
        return new EnviarPedido(UUID.randomUUID(), UNIDADE, CanalAtendimento.MESA, comanda,
                m.base.json(quote).get("revisao").asText(), linhas, "", null);
    }
}
