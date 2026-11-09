package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.delivery.dtos.ComandoOcorrencia;
import br.com.restaurantmanager.delivery.dtos.EnderecoCliente;
import br.com.restaurantmanager.financeiro.dtos.AlocacaoAjuste;
import br.com.restaurantmanager.financeiro.dtos.EntradaAjuste;
import br.com.restaurantmanager.financeiro.dtos.EntradaRecebimento;
import br.com.restaurantmanager.pedidos.dtos.EnderecoEntrega;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;

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

import java.util.List;
import java.util.UUID;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class Sprint04OperacaoTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private PedidosCenario p;

    @BeforeAll
    static void banco() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void preparar() throws Exception {
        p = new PedidosCenario(mvc, mapper);
    }

    @AfterEach
    void limpar() throws Exception {
        p.close();
    }

    @Test
    void enderecosSaoPessoaisVersionadosERejeitamCaracteresDeControle() throws Exception {
        UUID id = UUID.randomUUID();
        String url = "/api/v1/clientes/me/enderecos/" + id;
        var e =
                new EnderecoEntrega(
                        "Rua fictícia",
                        "42",
                        "",
                        "Centro",
                        "Cidade",
                        "SP",
                        "01000000",
                        "Cliente fictício",
                        "11999999999");
        var entrada = new EnderecoCliente(id, 0, "Casa", e, true);
        for (int i = 0; i < 2; i++) {
            var r = p.c.enviar("PUT", url, p.tokenCliente, entrada);
            assertThat(r.getStatus()).as(r.getContentAsString()).isEqualTo(200);
            assertThat(p.c.json(r).get("versao").asInt()).isEqualTo(1);
        }
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        url,
                                        p.tokenCliente,
                                        new EnderecoCliente(id, 0, "Trabalho", e, true))
                                .getStatus())
                .isEqualTo(409);
        String outro = p.c.login(p.c.usuario("CLIENTE"));
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        url,
                                        outro,
                                        new EnderecoCliente(id, 1, "Outra pessoa", e, true))
                                .getStatus())
                .isEqualTo(404);
        assertThat(p.c.json(p.c.enviar("GET", "/api/v1/clientes/me/enderecos", outro, null)).size())
                .isZero();
        assertThat(p.c.enviar("PUT", url, p.c.token, entrada).getStatus()).isEqualTo(403);
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        url,
                                        p.tokenCliente,
                                        new EnderecoCliente(
                                                id,
                                                1,
                                                "Casa",
                                                new EnderecoEntrega(
                                                        "Rua\u0000",
                                                        "1",
                                                        "",
                                                        "Centro",
                                                        "Cidade",
                                                        "SP",
                                                        "01000000"),
                                                true))
                                .getStatus())
                .isEqualTo(400);
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        url,
                                        p.tokenCliente,
                                        new EnderecoCliente(id, 1, "Casa", e, false))
                                .getStatus())
                .isEqualTo(200);
        assertThat(
                        p.c.json(
                                        p.c.enviar(
                                                "GET",
                                                "/api/v1/clientes/me/enderecos",
                                                p.tokenCliente,
                                                null))
                                .size())
                .isZero();
    }

    private JsonNode pronto(CanalAtendimento canal) throws Exception {
        var pedido =
                p.enviar(
                        p.entrada(
                                List.of(
                                        new Linha(
                                                UUID.randomUUID(),
                                                p.produto.id(),
                                                1,
                                                List.of(),
                                                List.of())),
                                canal,
                                null));
        pedido = p.acao(pedido, "aceitar", List.of());
        pedido = p.acao(pedido, "iniciar", p.unidades(pedido));
        return p.acao(pedido, "concluir", p.unidades(pedido));
    }

    @Test
    void expedicaoExigePagamentoNaConclusaoESeparaDecisaoGerencial() throws Exception {
        var pedido = pronto(CanalAtendimento.DELIVERY);
        String exp = p.funcionario("EXPEDICAO");
        assertThat(p.acao(pedido, "despachar", exp, List.of()).getStatus()).isEqualTo(200);
        pedido = p.detalhe(pedido);
        assertThat(pedido.get("estado").asText()).isEqualTo("EM_ENTREGA");
        assertThat(p.acao(pedido, "entregar", exp, List.of()).getStatus()).isEqualTo(409);
        String base = "/api/v1/expedicao/pedidos/" + pedido.get("id").asText();
        var ocorrencia =
                new ComandoOcorrencia(
                        UUID.randomUUID(),
                        pedido.get("versao").asLong(),
                        "Cliente ausente",
                        null,
                        null);
        assertThat(p.c.enviar("POST", base + "/ocorrencia", exp, ocorrencia).getStatus())
                .isEqualTo(200);
        assertThat(p.c.enviar("POST", base + "/ocorrencia", exp, ocorrencia).getStatus())
                .isEqualTo(200);
        pedido = p.detalhe(pedido);
        var decisao =
                new ComandoOcorrencia(
                        UUID.randomUUID(),
                        pedido.get("versao").asLong(),
                        "Nova tentativa autorizada",
                        "NOVA_TENTATIVA",
                        null);
        assertThat(p.c.enviar("POST", base + "/decidir", exp, decisao).getStatus()).isEqualTo(403);
        assertThat(
                        p.c.enviar("POST", base + "/decidir", p.funcionario("GERENTE"), decisao)
                                .getStatus())
                .isEqualTo(200);
        pedido = p.detalhe(pedido);
        String financeiro = "/api/v1/financeiro/pedidos/" + pedido.get("id").asText();
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        financeiro + "/recebimentos",
                                        exp,
                                        new EntradaRecebimento(
                                                UUID.randomUUID(), "PIX", "20.00", null))
                                .getStatus())
                .isEqualTo(403);
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        financeiro + "/recebimentos",
                                        p.funcionario("CAIXA"),
                                        new EntradaRecebimento(
                                                UUID.randomUUID(), "PIX", "20.00", null))
                                .getStatus())
                .isEqualTo(200);
        assertThat(p.acao(pedido, "entregar", exp, List.of()).getStatus()).isEqualTo(200);
        assertThat(p.detalhe(pedido).get("estado").asText()).isEqualTo("CONCLUIDO");
        assertThat(
                        p.c.enviar(
                                        "GET",
                                        "/api/v1/expedicao?unidadeId=" + UNIDADE,
                                        p.funcionario("COZINHA"),
                                        null)
                                .getStatus())
                .isEqualTo(403);
    }

    @Test
    void cancelamentoAposDespachoExigeEscolhaExplicitaDaTaxa() throws Exception {
        var pedido = pronto(CanalAtendimento.DELIVERY);
        pedido = p.acao(pedido, "despachar", List.of());
        assertThat(p.acao(pedido, "cancelar", p.c.token, List.of()).getStatus()).isEqualTo(409);
        String base = "/api/v1/expedicao/pedidos/" + pedido.get("id").asText();
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        base + "/ocorrencia",
                                        p.c.token,
                                        new ComandoOcorrencia(
                                                UUID.randomUUID(),
                                                pedido.get("versao").asLong(),
                                                "Entrega inviável",
                                                null,
                                                null))
                                .getStatus())
                .isEqualTo(200);
        pedido = p.detalhe(pedido);
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        base + "/decidir",
                                        p.c.token,
                                        new ComandoOcorrencia(
                                                UUID.randomUUID(),
                                                pedido.get("versao").asLong(),
                                                "Cancelamento autorizado",
                                                "CANCELAMENTO",
                                                null))
                                .getStatus())
                .isEqualTo(422);
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        base + "/decidir",
                                        p.c.token,
                                        new ComandoOcorrencia(
                                                UUID.randomUUID(),
                                                pedido.get("versao").asLong(),
                                                "Cancelamento autorizado",
                                                "CANCELAMENTO",
                                                true))
                                .getStatus())
                .isEqualTo(200);
        assertThat(p.detalhe(pedido).get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
    }

    @Test
    void retiradaNaoConcluiComSaldoPendente() throws Exception {
        var pedido = pronto(CanalAtendimento.RETIRADA);
        assertThat(p.acao(pedido, "retirar", p.c.token, List.of()).getStatus()).isEqualTo(409);
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        "/api/v1/financeiro/pedidos/"
                                                + pedido.get("id").asText()
                                                + "/recebimentos",
                                        p.c.token,
                                        new EntradaRecebimento(
                                                UUID.randomUUID(), "DINHEIRO", "20.00", "50.00"))
                                .getStatus())
                .isEqualTo(200);
        assertThat(p.acao(pedido, "retirar", p.c.token, List.of()).getStatus()).isEqualTo(200);
    }

    @Test
    void relatorioConfereMassaConhecidaFusoEPermissao() throws Exception {
        var primeiro = p.enviar(p.entrada(2));
        var segundo = p.enviar(p.entrada(1));
        String base = "/api/v1/financeiro/pedidos/" + primeiro.get("id").asText();
        var recebido =
                p.c.json(
                        p.c.enviar(
                                "POST",
                                base + "/recebimentos",
                                p.c.token,
                                new EntradaRecebimento(UUID.randomUUID(), "PIX", "40.00", null)));
        UUID parcela = UUID.fromString(recebido.get("parcelas").get(0).get("id").asText());
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        base + "/ajustes",
                                        p.c.token,
                                        new EntradaAjuste(
                                                UUID.randomUUID(),
                                                "Desconto",
                                                List.of(new AlocacaoAjuste(parcela, "10.00"))))
                                .getStatus())
                .isEqualTo(200);
        assertThat(p.acao(segundo, "cancelar", p.c.token, List.of()).getStatus()).isEqualTo(200);
        // 02:59:59 UTC pertence ao dia anterior em America/Sao_Paulo.
        p.c.executar("update " + p.c.schema + ".pedido set criado_em='2026-10-31T02:59:59Z'");
        p.c.executar(
                "update " + p.c.schema + ".recebimento set confirmado_em='2026-10-30T18:00:00Z'");
        p.c.executar(
                "update " + p.c.schema + ".ajuste_cobranca set criado_em='2026-10-30T18:00:00Z'");
        String url =
                "/api/v1/relatorios/vendas?unidadeId="
                        + UNIDADE
                        + "&inicio=2026-10-30&fim=2026-10-30";
        var r = p.c.enviar("GET", url, p.c.token, null);
        assertThat(r.getStatus()).as(r.getContentAsString()).isEqualTo(200);
        var d = p.c.json(r);
        assertThat(d.get("pedidosCriados").asLong()).isEqualTo(2);
        assertThat(d.get("canceladosAtualmente").asLong()).isEqualTo(1);
        assertThat(d.get("cobrancasOriginais").asText()).isEqualTo("60.00");
        assertThat(d.get("ajustesNoPeriodo").asText()).isEqualTo("30.00");
        assertThat(d.get("recebimentosConfirmados").asText()).isEqualTo("40.00");
        assertThat(d.get("saldoADevolverAtual").asText()).isEqualTo("10.00");
        assertThat(p.c.enviar("GET", url, p.tokenCliente, null).getStatus()).isEqualTo(403);
        assertThat(p.c.enviar("GET", url, p.funcionario("COZINHA"), null).getStatus())
                .isEqualTo(403);
        var caixa = p.c.usuario("GERENTE");
        p.c.vincular(caixa, CatalogoCenario.OUTRA_UNIDADE);
        assertThat(p.c.enviar("GET", url, p.c.login(caixa), null).getStatus()).isEqualTo(404);
        assertThat(
                        p.c.json(
                                        p.c.enviar(
                                                "GET",
                                                url.replace("2026-10-30", "2026-10-31"),
                                                p.c.token,
                                                null))
                                .get("pedidosCriados")
                                .asLong())
                .isZero();
    }
}
