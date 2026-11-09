package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Calcular;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.financeiro.dtos.ConfirmarDevolucao;
import br.com.restaurantmanager.financeiro.dtos.EntradaDevolucao;
import br.com.restaurantmanager.financeiro.dtos.EntradaRecebimento;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

@SpringBootTest
@AutoConfigureMockMvc
class FinanceiroComandaTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @Test
    void comandaSemConsumoConsultaFinanceiroVazioSemCriarCobranca() throws Exception {
        try (var m = new MesasCenario(mvc, mapper)) {
            UUID comanda = m.comanda(m.abrir());
            String url = "/api/v1/financeiro/comandas/" + comanda;
            for (int i = 0; i < 2; i++) {
                var resposta = m.base.enviar("GET", url, m.base.token, null);
                assertThat(resposta.getStatus()).as(resposta.getContentAsString()).isEqualTo(200);
                var dados = m.base.json(resposta);
                assertThat(dados.get("cobrancaId").isNull()).isTrue();
                assertThat(dados.get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
                assertThat(dados.get("recebimentos").size()).isZero();
                assertThat(dados.get("parcelas").size()).isZero();
            }
            assertThat(m.base.contar("cobranca")).isZero();
            String cliente = m.base.login(m.base.usuario("CLIENTE"));
            assertThat(m.base.enviar("GET", url, cliente, null).getStatus()).isEqualTo(403);
        }
    }

    @Test
    void centoEVinteRecebidosCinquentaCanceladosOitentaDeixamDezADevolver() throws Exception {
        try (var m = new MesasCenario(mvc, mapper)) {
            var categoria = m.base.categoria("Consumo");
            var produto = m.base.produto(categoria, "Prato fictício", List.of(), List.of());
            m.base.ofertar(produto.id(), UNIDADE, "20.00", true);
            m.base.executar("update " + m.base.schema + ".produto_unidade set mesa=true");
            UUID comanda = m.comanda(m.abrir());
            JsonNode oitenta = enviar(m, comanda, produto.id(), 4);
            JsonNode quarenta = enviar(m, comanda, produto.id(), 2);
            String url = "/api/v1/financeiro/comandas/" + comanda;
            assertThat(m.estado(comanda, "iniciar-fechamento", 0).getStatus()).isEqualTo(200);
            var recebido =
                    m.base.enviar(
                            "POST",
                            url + "/recebimentos",
                            m.base.token,
                            new EntradaRecebimento(
                                    UUID.randomUUID(), "DINHEIRO", "50.00", "50.00"));
            assertThat(recebido.getStatus()).as(recebido.getContentAsString()).isEqualTo(200);
            assertThat(m.estado(comanda, "reabrir", 1).getStatus()).isEqualTo(409);
            String pedido = oitenta.get("id").asText();
            var cancelado =
                    m.base.enviar(
                            "POST",
                            "/api/v1/operacao/pedidos/" + pedido + "/cancelar",
                            m.base.token,
                            new ComandoPedido(UUID.randomUUID(), 0, "Rodada cancelada", List.of()));
            assertThat(cancelado.getStatus()).as(cancelado.getContentAsString()).isEqualTo(200);
            var dados = m.base.json(m.base.enviar("GET", url, m.base.token, null));
            assertThat(dados.get("saldo").get("totalDevido").asText()).isEqualTo("40.00");
            assertThat(dados.get("saldo").get("saldoADevolver").asText()).isEqualTo("10.00");
            assertThat(m.estado(comanda, "concluir", 1).getStatus()).isEqualTo(409);
            UUID recebimento = UUID.fromString(dados.get("recebimentos").get(0).get("id").asText());
            var devolucao =
                    new EntradaDevolucao(
                            UUID.randomUUID(),
                            recebimento,
                            "10.00",
                            "Excedente agregado da comanda");
            assertThat(
                            m.base.enviar("POST", url + "/devolucoes", m.base.token, devolucao)
                                    .getStatus())
                    .isEqualTo(200);
            assertThat(m.estado(comanda, "concluir", 1).getStatus()).isEqualTo(409);
            assertThat(
                            m.base.enviar(
                                            "POST",
                                            url
                                                    + "/devolucoes/"
                                                    + devolucao.intencaoId()
                                                    + "/confirmar",
                                            m.base.token,
                                            new ConfirmarDevolucao(UUID.randomUUID()))
                                    .getStatus())
                    .isEqualTo(200);
            List<UUID> unidades =
                    quarenta.get("unidades")
                            .valueStream()
                            .map(u -> UUID.fromString(u.get("id").asText()))
                            .toList();
            String id = quarenta.get("id").asText();
            assertThat(
                            m.base.enviar(
                                            "POST",
                                            "/api/v1/cozinha/pedidos/" + id + "/iniciar",
                                            m.base.token,
                                            new ComandoPedido(UUID.randomUUID(), 0, "", unidades))
                                    .getStatus())
                    .isEqualTo(200);
            assertThat(
                            m.base.enviar(
                                            "POST",
                                            "/api/v1/cozinha/pedidos/" + id + "/concluir",
                                            m.base.token,
                                            new ComandoPedido(UUID.randomUUID(), 1, "", unidades))
                                    .getStatus())
                    .isEqualTo(200);
            assertThat(
                            m.base.enviar(
                                            "POST",
                                            "/api/v1/operacao/pedidos/" + id + "/servir",
                                            m.base.token,
                                            new ComandoPedido(UUID.randomUUID(), 2, "", List.of()))
                                    .getStatus())
                    .isEqualTo(200);
            assertThat(m.estado(comanda, "concluir", 1).getStatus()).isEqualTo(200);
        }
    }

    private JsonNode enviar(MesasCenario m, UUID comanda, UUID produto, int quantidade)
            throws Exception {
        var linhas =
                List.of(new Linha(UUID.randomUUID(), produto, quantidade, List.of(), List.of()));
        var resumo =
                m.base.json(
                        m.base.enviar(
                                "POST",
                                "/api/v1/carrinho/calcular",
                                null,
                                new Calcular(UNIDADE, CanalAtendimento.MESA, linhas, null)));
        var r =
                m.base.enviar(
                        "POST",
                        "/api/v1/operacao/pedidos",
                        m.base.token,
                        new EnviarPedido(
                                UUID.randomUUID(),
                                UNIDADE,
                                CanalAtendimento.MESA,
                                comanda,
                                resumo.get("revisao").asText(),
                                linhas,
                                "",
                                null));
        assertThat(r.getStatus()).as(r.getContentAsString()).isEqualTo(200);
        return m.base.json(r);
    }
}
