package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static br.com.restaurantmanager.CatalogoCenario.OUTRA_UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.time.ZoneId;
import java.util.HashSet;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class CozinhaPainelTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private PedidosCenario p;

    @BeforeAll static void preparar() throws Exception { TestDatabase.prepare(); }
    @BeforeEach void cenario() throws Exception { p = new PedidosCenario(mvc, mapper); }
    @AfterEach void limpar() throws Exception { p.close(); }

    @Test
    void agrupaEstadoConfirmadoSemDuplicarPreparoParcialENaoExpoeFinancas() throws Exception {
        var fila = p.acao(p.enviar(p.entrada(1)), "aceitar", List.of());
        var parcial = p.acao(p.enviar(p.entrada(3)), "aceitar", List.of());
        var unidades = p.unidades(parcial);
        parcial = p.acao(parcial, "iniciar", List.of(unidades.get(0), unidades.get(1)));
        parcial = p.acao(parcial, "concluir", List.of(unidades.get(0)));
        var pronto = pronto();
        p.enviar(p.entrada(1)); // Ainda sem aceite: não entra na cozinha.
        var painel = painel("");
        assertThat(painel.get("fila").get("total").asInt()).isEqualTo(1);
        assertThat(painel.get("emPreparo").get("total").asInt()).isEqualTo(1);
        assertThat(painel.get("prontos").get("total").asInt()).isEqualTo(1);
        assertThat(painel.get("fila").get("itens").get(0).get("pedido").get("id").asText()).isEqualTo(fila.get("id").asText());
        assertThat(painel.get("emPreparo").get("itens").get(0).get("pedido").get("id").asText()).isEqualTo(parcial.get("id").asText());
        assertThat(painel.get("prontos").get("itens").get(0).get("prontoEm").isNull()).isFalse();
        assertThat(painel.toString()).doesNotContain("precoUnitario", "subtotal", "saldo", "endereco", "email", "contato");
        assertThat(painel("&canal=MESA").get("prontos").get("total").asInt()).isZero();
    }

    @Test
    void separaProntosPelaConclusaoNoFusoDaUnidadeIncluindoLimiteExato() throws Exception {
        String fuso = "Pacific/Kiritimati";
        p.c.executar("update " + p.c.schema + ".unidade set fuso='" + fuso + "' where id='" + UNIDADE + "'");
        var inicio = Instant.now().atZone(ZoneId.of(fuso)).toLocalDate().atStartOfDay(ZoneId.of(fuso)).toInstant();
        var antigo = pronto();
        var atual = pronto();
        // Pedido antigo preparado hoje continua no grupo de hoje.
        p.c.executar("update " + p.c.schema + ".pedido set criado_em='2000-01-01' where id='" + atual.get("id").asText() + "'");
        conclusao(antigo, inicio.minusSeconds(1));
        conclusao(atual, inicio);
        var painel = painel("");
        assertThat(painel.get("fuso").asText()).isEqualTo(fuso);
        assertThat(painel.get("anteriores").get("total").asInt()).isEqualTo(1);
        assertThat(painel.get("prontos").get("total").asInt()).isEqualTo(1);
        assertThat(painel.get("anteriores").get("itens").get(0).get("pedido").get("id").asText()).isEqualTo(antigo.get("id").asText());
        assertThat(painel.get("prontos").get("itens").get(0).get("pedido").get("id").asText()).isEqualTo(atual.get("id").asText());
    }

    @Test
    void totalGlobalEPaginasIndependentesNaoPerdemPedidosAcimaDeCinquenta() throws Exception {
        var original = p.acao(p.enviar(p.entrada(1)), "aceitar", List.of());
        String tabela = p.c.schema + ".pedido";
        p.c.executar("insert into " + tabela + "(id,unidade_id,usuario_id,autoria,canal,estado,criado_em,alertar_em,expirar_em,observacao,linhas,endereco,payload,aguardando_aceite_em,alerta_segundos_snapshot,expiracao_segundos_snapshot) "
                + "select gen_random_uuid(),unidade_id,usuario_id,autoria,canal,estado,criado_em+n*interval '1 second',alertar_em,expirar_em,observacao,linhas,endereco,payload,aguardando_aceite_em,alerta_segundos_snapshot,expiracao_segundos_snapshot from " + tabela
                + " cross join generate_series(1,51) n where id='" + original.get("id").asText() + "'");
        pronto();
        var primeira = painel(""); var segunda = painel("&paginaFila=1");
        assertThat(primeira.get("fila").get("total").asInt()).isEqualTo(52);
        assertThat(primeira.get("fila").get("itens").size()).isEqualTo(50);
        assertThat(primeira.get("fila").get("mais").asBoolean()).isTrue();
        assertThat(segunda.get("fila").get("itens").size()).isEqualTo(2);
        assertThat(segunda.get("fila").get("mais").asBoolean()).isFalse();
        assertThat(segunda.get("prontos")).isEqualTo(primeira.get("prontos"));
        var ids = new HashSet<String>();
        for (var pagina : List.of(primeira, segunda)) pagina.get("fila").get("itens").forEach(c -> assertThat(ids.add(c.get("pedido").get("id").asText())).isTrue());
        assertThat(painel("&paginaFila=2").get("fila").get("total").asInt()).isEqualTo(52);
    }

    @Test
    void revalidaSessaoPermissaoUnidadeTenantEEntradas() throws Exception {
        String rota = "/api/v1/cozinha/painel?unidadeId=" + UNIDADE;
        String cozinha = p.funcionario("COZINHA");
        assertThat(p.c.enviar("GET", rota, p.tokenCliente, null).getStatus()).isEqualTo(403);
        assertThat(p.c.enviar("GET", rota, cozinha, null).getStatus()).isEqualTo(200);
        assertThat(p.c.enviar("GET", "/api/v1/cozinha/painel?unidadeId=" + OUTRA_UNIDADE, cozinha, null).getStatus()).isEqualTo(404);
        try (var outra = new CatalogoCenario(mvc, mapper)) {
            assertThat(outra.json(outra.enviar("GET", rota, outra.token, null)).get("fila").get("total").asInt()).isZero();
        }
        for (String invalido : List.of("&paginaFila=-1", "&paginaPreparo=10001", "&paginaProntos=x", "&paginaAnteriores=-1", "&canal=INVALIDO")) {
            assertThat(p.c.enviar("GET", rota + invalido, cozinha, null).getStatus()).isEqualTo(invalido.contains("=-1") || invalido.contains("=10001") ? 422 : 400);
        }
        p.c.reautenticar(); p.c.configurarAcoes("COZINHA", List.of());
        assertThat(p.c.enviar("GET", rota, cozinha, null).getStatus()).isEqualTo(403);
    }

    private JsonNode painel(String parametros) throws Exception {
        var resposta = p.c.enviar("GET", "/api/v1/cozinha/painel?unidadeId=" + UNIDADE + parametros, p.c.token, null);
        assertThat(resposta.getStatus()).as(resposta.getContentAsString()).isEqualTo(200);
        return p.c.json(resposta);
    }
    private JsonNode pronto() throws Exception {
        var pedido = p.acao(p.enviar(p.entrada(1)), "aceitar", List.of());
        pedido = p.acao(pedido, "iniciar", p.unidades(pedido));
        return p.acao(pedido, "concluir", p.unidades(pedido));
    }
    private void conclusao(JsonNode pedido, Instant instante) throws Exception {
        p.c.executar("update " + p.c.schema + ".unidade_producao set iniciado_em='" + instante.minusSeconds(60)
                + "',concluido_em='" + instante + "' where pedido_id='" + pedido.get("id").asText() + "'");
    }
}
