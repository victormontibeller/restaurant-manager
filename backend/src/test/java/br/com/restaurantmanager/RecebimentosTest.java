package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Escolha;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.catalogo.dtos.Grupo;
import br.com.restaurantmanager.catalogo.dtos.Opcao;
import br.com.restaurantmanager.financeiro.dtos.AlocacaoAjuste;
import br.com.restaurantmanager.financeiro.dtos.ConfirmarDevolucao;
import br.com.restaurantmanager.financeiro.dtos.EntradaAjuste;
import br.com.restaurantmanager.financeiro.dtos.EntradaDevolucao;
import br.com.restaurantmanager.financeiro.dtos.EntradaRecebimento;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;

@SpringBootTest(properties = "rm.stage=test")
@AutoConfigureMockMvc
class RecebimentosTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private PedidosCenario p;
    private String url;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void cenario() throws Exception {
        p = new PedidosCenario(mvc, mapper);
        var pedido = p.enviar(p.entrada(2));
        url = "/api/v1/financeiro/pedidos/" + pedido.get("id").asText();
    }

    @AfterEach
    void limpar() throws Exception {
        p.close();
    }

    @Test
    void parcelasIdentificamNomeDoSnapshotEUnidadeMesmoAposAlterarCatalogo() throws Exception {
        p.c.executar(
                "update "
                        + p.c.schema
                        + ".produto set nome='Nome atual alterado' where id='"
                        + p.produto.id()
                        + "'");
        var resposta = p.c.enviar("GET", url, p.c.token, null);
        assertThat(resposta.getStatus()).isEqualTo(200);
        var descricoes = new ArrayList<String>();
        p.c.json(resposta)
                .get("parcelas")
                .forEach(parcela -> descricoes.add(parcela.path("descricao").asText()));
        assertThat(descricoes)
                .containsExactlyInAnyOrder(
                        p.produto.nome() + " · item 1 · unidade 1",
                        p.produto.nome() + " · item 1 · unidade 2");
    }

    @Test
    void dinheiroPreservaTrocoEReplayNaoDuplicaNemAceitaPayloadDivergente() throws Exception {
        var entrada = new EntradaRecebimento(UUID.randomUUID(), "DINHEIRO", "40.00", "100.00");
        for (int i = 0; i < 2; i++) {
            var r = p.c.enviar("POST", url + "/recebimentos", p.c.token, entrada);
            assertThat(r.getStatus()).as(r.getContentAsString()).isEqualTo(200);
            var dados = p.c.json(r);
            assertThat(dados.get("recebimentos").size()).isEqualTo(1);
            assertThat(dados.get("recebimentos").get(0).get("troco").asText()).isEqualTo("60.00");
            assertThat(dados.get("saldo").get("saldoAReceber").asText()).isEqualTo("0.00");
        }
        String fluxo = "/api/v1/eventos?unidadeId=" + CatalogoCenario.UNIDADE + "&depois=0";
        assertThat(p.c.enviar("POST", url + "/recebimentos", p.tokenCliente, entrada).getStatus())
                .isEqualTo(403);
        var eventos = p.c.enviar("GET", fluxo, p.tokenCliente, null);
        assertThat(eventos.getStatus()).isEqualTo(200);
        assertThat(eventos.getContentAsString().split("RECEBIMENTO_CONFIRMADO", -1)).hasSize(2);
        String outroCliente = p.c.login(p.c.usuario("CLIENTE"));
        assertThat(p.c.enviar("GET", fluxo, outroCliente, null).getContentAsString())
                .doesNotContain("RECEBIMENTO_CONFIRMADO");
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        url + "/recebimentos",
                                        p.c.token,
                                        new EntradaRecebimento(
                                                entrada.intencaoId(),
                                                "DINHEIRO",
                                                "39.00",
                                                "100.00"))
                                .getStatus())
                .isEqualTo(409);
    }

    @Test
    void concorrenciaNaoRecebeAcimaDoSaldo() throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            var tarefas =
                    executor.invokeAll(
                            List.of(
                                    () ->
                                            p.c.enviar(
                                                            "POST",
                                                            url + "/recebimentos",
                                                            p.c.token,
                                                            new EntradaRecebimento(
                                                                    UUID.randomUUID(),
                                                                    "PIX",
                                                                    "30.00",
                                                                    null))
                                                    .getStatus(),
                                    () ->
                                            p.c.enviar(
                                                            "POST",
                                                            url + "/recebimentos",
                                                            p.c.token,
                                                            new EntradaRecebimento(
                                                                    UUID.randomUUID(),
                                                                    "CARTAO",
                                                                    "30.00",
                                                                    null))
                                                    .getStatus()));
            assertThat(tarefas.get(0).get()).isIn(200, 409);
            assertThat(tarefas.get(1).get()).isIn(200, 409);
            assertThat(List.of(tarefas.get(0).get(), tarefas.get(1).get()))
                    .containsExactlyInAnyOrder(200, 409);
        }
        var dados = p.c.json(p.c.enviar("GET", url, p.c.token, null));
        assertThat(dados.get("saldo").get("pagoConfirmado").asText()).isEqualTo("30.00");
    }

    @Test
    void ajusteReservaDevolucaoEConfirmacaoPreservamSaldo() throws Exception {
        var recebido =
                p.c.enviar(
                        "POST",
                        url + "/recebimentos",
                        p.c.token,
                        new EntradaRecebimento(UUID.randomUUID(), "PIX", "40.00", null));
        assertThat(recebido.getStatus()).isEqualTo(200);
        var dados = p.c.json(recebido);
        UUID recebimento = UUID.fromString(dados.get("recebimentos").get(0).get("id").asText());
        UUID parcela = UUID.fromString(dados.get("parcelas").get(0).get("id").asText());
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        url + "/ajustes",
                                        p.c.token,
                                        new EntradaAjuste(
                                                UUID.randomUUID(),
                                                "Abatimento comercial",
                                                List.of(new AlocacaoAjuste(parcela, "10.00"))))
                                .getStatus())
                .isEqualTo(200);
        var entrada =
                new EntradaDevolucao(
                        UUID.randomUUID(), recebimento, "10.00", "Abatimento aprovado");
        var solicitada = p.c.enviar("POST", url + "/devolucoes", p.c.token, entrada);
        assertThat(solicitada.getStatus()).as(solicitada.getContentAsString()).isEqualTo(200);
        assertThat(p.c.json(solicitada).get("reservado").asText()).isEqualTo("10.00");
        assertThat(p.c.json(solicitada).get("saldo").get("pendenciaFinanceira").asBoolean())
                .isTrue();
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        url + "/devolucoes",
                                        p.c.token,
                                        new EntradaDevolucao(
                                                UUID.randomUUID(),
                                                recebimento,
                                                "0.01",
                                                "Duplicada"))
                                .getStatus())
                .isEqualTo(409);
        var confirmar = new ConfirmarDevolucao(UUID.randomUUID());
        for (int i = 0; i < 2; i++) {
            var r =
                    p.c.enviar(
                            "POST",
                            url + "/devolucoes/" + entrada.intencaoId() + "/confirmar",
                            p.c.token,
                            confirmar);
            assertThat(r.getStatus()).as(r.getContentAsString()).isEqualTo(200);
            dados = p.c.json(r);
            assertThat(dados.get("saldo").get("devolvidoConfirmado").asText()).isEqualTo("10.00");
            assertThat(dados.get("saldo").get("saldoAReceber").asText()).isEqualTo("0.00");
            assertThat(dados.get("saldo").get("pendenciaFinanceira").asBoolean()).isFalse();
        }
    }

    @Test
    void clienteCozinhaOutraUnidadeEOutroTenantNaoRegistramRecebimento() throws Exception {
        var entrada = new EntradaRecebimento(UUID.randomUUID(), "PIX", "10.00", null);
        assertThat(p.c.enviar("POST", url + "/recebimentos", p.tokenCliente, entrada).getStatus())
                .isEqualTo(403);
        assertThat(
                        p.c.enviar("POST", url + "/recebimentos", p.funcionario("COZINHA"), entrada)
                                .getStatus())
                .isEqualTo(403);
        var caixa = p.c.usuario("CAIXA");
        p.c.vincular(caixa, CatalogoCenario.OUTRA_UNIDADE);
        assertThat(p.c.enviar("POST", url + "/recebimentos", p.c.login(caixa), entrada).getStatus())
                .isEqualTo(404);
        try (var outro = new CatalogoCenario(mvc, mapper)) {
            assertThat(
                            outro.enviar("POST", url + "/recebimentos", outro.token, entrada)
                                    .getStatus())
                    .isEqualTo(404);
        }
        assertThat(p.contar("recebimento")).isZero();
    }

    @Test
    void rejeitaSobrepagamentoValoresInvalidosETrocoForaDeDinheiro() throws Exception {
        for (var entrada :
                List.of(
                        new EntradaRecebimento(UUID.randomUUID(), "PIX", "40.01", null),
                        new EntradaRecebimento(UUID.randomUUID(), "CARTAO", "20.00", "50.00"),
                        new EntradaRecebimento(UUID.randomUUID(), "DINHEIRO", "20.00", "19.99"),
                        new EntradaRecebimento(UUID.randomUUID(), "PIX", "0.00", null))) {
            assertThat(p.c.enviar("POST", url + "/recebimentos", p.c.token, entrada).getStatus())
                    .isIn(409, 422);
        }
        assertThat(p.contar("recebimento")).isZero();
    }

    @Test
    void ajusteDelegadoRevalidaMesmoJwtAntesDeReplayEIsolaFilialETenant() throws Exception {
        String caixa = p.funcionario("CAIXA");
        var estado = p.c.json(p.c.enviar("GET", url, p.c.token, null));
        UUID parcela = UUID.fromString(estado.get("parcelas").get(0).get("id").asText());
        var ajuste = new EntradaAjuste(UUID.randomUUID(), "Desconto delegado",
                List.of(new AlocacaoAjuste(parcela, "10.00")));
        String rota = url + "/ajustes";
        assertThat(p.c.enviar("POST", rota, caixa, ajuste).getStatus()).isEqualTo(403);
        assertThat(p.contar("ajuste_cobranca")).isZero();

        p.c.reautenticar();
        p.c.configurarAcoes("CAIXA", List.of("financeiro.ajustar"));
        var restrito = p.c.usuario("CAIXA");
        p.c.vincular(restrito, CatalogoCenario.OUTRA_UNIDADE);
        assertThat(p.c.enviar("POST", rota, p.c.login(restrito), ajuste).getStatus()).isEqualTo(404);
        try (var outro = new CatalogoCenario(mvc, mapper)) {
            assertThat(outro.enviar("POST", rota, outro.token, ajuste).getStatus()).isEqualTo(404);
        }
        assertThat(p.contar("ajuste_cobranca")).isZero();
        assertThat(p.c.enviar("POST", rota, caixa, ajuste).getStatus()).isEqualTo(200);
        assertThat(p.contar("ajuste_cobranca")).isEqualTo(1);

        p.c.configurarAcoes("CAIXA", List.of("pedido.consultar"));
        assertThat(p.c.enviar("POST", rota, caixa, ajuste).getStatus()).isEqualTo(403);
        assertThat(p.contar("ajuste_cobranca")).isEqualTo(1);
        assertThat(p.c.json(p.c.enviar("GET", url, p.c.token, null))
                .get("saldo").get("totalDevido").asText()).isEqualTo("30.00");
    }

    @Test
    void devolucaoDelegadaRevalidaSolicitacaoConfirmacaoEReplayComMesmoJwt() throws Exception {
        var recebido = p.c.json(p.c.enviar("POST", url + "/recebimentos", p.c.token,
                new EntradaRecebimento(UUID.randomUUID(), "PIX", "40.00", null)));
        UUID recebimento = UUID.fromString(recebido.get("recebimentos").get(0).get("id").asText());
        UUID parcela = UUID.fromString(recebido.get("parcelas").get(0).get("id").asText());
        assertThat(p.c.enviar("POST", url + "/ajustes", p.c.token,
                new EntradaAjuste(UUID.randomUUID(), "Abatimento para devolução",
                        List.of(new AlocacaoAjuste(parcela, "10.00")))).getStatus()).isEqualTo(200);
        String caixa = p.funcionario("CAIXA");
        var devolucao = new EntradaDevolucao(UUID.randomUUID(), recebimento, "10.00", "Excedente delegado");
        String rota = url + "/devolucoes";
        assertThat(p.c.enviar("POST", rota, caixa, devolucao).getStatus()).isEqualTo(403);
        assertThat(p.contar("devolucao")).isZero();

        p.c.reautenticar();
        p.c.configurarAcoes("CAIXA", List.of("devolucao.solicitar"));
        var restrito = p.c.usuario("CAIXA");
        p.c.vincular(restrito, CatalogoCenario.OUTRA_UNIDADE);
        String outraUnidade = p.c.login(restrito);
        assertThat(p.c.enviar("POST", rota, outraUnidade, devolucao).getStatus()).isEqualTo(404);
        try (var outro = new CatalogoCenario(mvc, mapper)) {
            assertThat(outro.enviar("POST", rota, outro.token, devolucao).getStatus()).isEqualTo(404);
        }
        assertThat(p.c.enviar("POST", rota, caixa, devolucao).getStatus()).isEqualTo(200);
        var confirmar = new ConfirmarDevolucao(UUID.randomUUID());
        String confirmacao = rota + "/" + devolucao.intencaoId() + "/confirmar";
        assertThat(p.c.enviar("POST", confirmacao, outraUnidade, confirmar).getStatus()).isEqualTo(404);
        try (var outro = new CatalogoCenario(mvc, mapper)) {
            assertThat(outro.enviar("POST", confirmacao, outro.token, confirmar).getStatus()).isEqualTo(404);
        }
        p.c.configurarAcoes("CAIXA", List.of("pedido.consultar"));
        assertThat(p.c.enviar("POST", rota, caixa, devolucao).getStatus()).isEqualTo(403);
        assertThat(p.c.enviar("POST", confirmacao, caixa, confirmar).getStatus()).isEqualTo(403);
        assertThat(p.c.json(p.c.enviar("GET", url, p.c.token, null))
                .get("saldo").get("devolvidoConfirmado").asText()).isEqualTo("0.00");

        p.c.configurarAcoes("CAIXA", List.of("devolucao.solicitar"));
        assertThat(p.c.enviar("POST", confirmacao, caixa, confirmar).getStatus()).isEqualTo(200);
        p.c.configurarAcoes("CAIXA", List.of("pedido.consultar"));
        assertThat(p.c.enviar("POST", confirmacao, caixa, confirmar).getStatus()).isEqualTo(403);
        assertThat(p.contar("devolucao")).isEqualTo(1);
        assertThat(p.c.json(p.c.enviar("GET", url, p.c.token, null))
                .get("saldo").get("devolvidoConfirmado").asText()).isEqualTo("10.00");
    }

    @Test
    void duasDevolucoesConcorrentesNaoComprometemMaisQueOExcedente() throws Exception {
        var recebido =
                p.c.json(
                        p.c.enviar(
                                "POST",
                                url + "/recebimentos",
                                p.c.token,
                                new EntradaRecebimento(UUID.randomUUID(), "PIX", "40.00", null)));
        UUID recebimento = UUID.fromString(recebido.get("recebimentos").get(0).get("id").asText());
        UUID primeira = UUID.fromString(recebido.get("parcelas").get(0).get("id").asText());
        UUID segunda = UUID.fromString(recebido.get("parcelas").get(1).get("id").asText());
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        url + "/ajustes",
                                        p.c.token,
                                        new EntradaAjuste(
                                                UUID.randomUUID(),
                                                "Abatimento autorizado",
                                                List.of(
                                                        new AlocacaoAjuste(primeira, "20.00"),
                                                        new AlocacaoAjuste(segunda, "10.00"))))
                                .getStatus())
                .isEqualTo(200);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var tarefas =
                    executor.invokeAll(
                            List.of(
                                    () ->
                                            p.c.enviar(
                                                            "POST",
                                                            url + "/devolucoes",
                                                            p.c.token,
                                                            new EntradaDevolucao(
                                                                    UUID.randomUUID(),
                                                                    recebimento,
                                                                    "20.00",
                                                                    "Primeira solicitação"))
                                                    .getStatus(),
                                    () ->
                                            p.c.enviar(
                                                            "POST",
                                                            url + "/devolucoes",
                                                            p.c.token,
                                                            new EntradaDevolucao(
                                                                    UUID.randomUUID(),
                                                                    recebimento,
                                                                    "20.00",
                                                                    "Segunda solicitação"))
                                                    .getStatus()));
            assertThat(List.of(tarefas.get(0).get(), tarefas.get(1).get()))
                    .containsExactlyInAnyOrder(200, 409);
        }
        var saldo = p.c.json(p.c.enviar("GET", url, p.c.token, null));
        assertThat(saldo.get("reservado").asText()).isEqualTo("20.00");
        assertThat(saldo.get("devolucoes").size()).isEqualTo(1);
    }

    @Test
    void comboPagoComDevolucaoAnteriorPendenteOuConfirmadaAbateSomenteRemanescente()
            throws Exception {
        for (boolean confirmar : List.of(false, true)) {
            var grupo = UUID.randomUUID();
            var opcao = UUID.randomUUID();
            var combo =
                    p.c.produto(
                            p.c.categoria("Combo"),
                            "Combo completo",
                            List.of(),
                            List.of(
                                    new Grupo(
                                            grupo,
                                            "Escolha",
                                            1,
                                            1,
                                            List.of(
                                                    new Opcao(
                                                            opcao,
                                                            p.produto.id(),
                                                            "10.00",
                                                            1,
                                                            List.of())))));
            p.c.ofertar(combo.id(), CatalogoCenario.UNIDADE, "30.00", true);
            var pedido =
                    p.enviar(
                            p.entrada(
                                    List.of(
                                            new Linha(
                                                    UUID.randomUUID(),
                                                    combo.id(),
                                                    1,
                                                    List.of(),
                                                    List.of(
                                                            new Escolha(
                                                                    grupo, opcao, 1, List.of())))),
                                    CanalAtendimento.RETIRADA,
                                    null));
            String conta = "/api/v1/financeiro/pedidos/" + pedido.get("id").asText();
            var dados =
                    p.c.json(
                            p.c.enviar(
                                    "POST",
                                    conta + "/recebimentos",
                                    p.c.token,
                                    new EntradaRecebimento(
                                            UUID.randomUUID(), "PIX", "40.00", null)));
            UUID recebimento = UUID.fromString(dados.get("recebimentos").get(0).get("id").asText());
            UUID parcela = UUID.fromString(dados.get("parcelas").get(0).get("id").asText());
            assertThat(
                            p.c.enviar(
                                            "POST",
                                            conta + "/ajustes",
                                            p.c.token,
                                            new EntradaAjuste(
                                                    UUID.randomUUID(),
                                                    "Abatimento do combo",
                                                    List.of(new AlocacaoAjuste(parcela, "10.00"))))
                                    .getStatus())
                    .isEqualTo(200);
            UUID devolucao = UUID.randomUUID();
            assertThat(
                            p.c.enviar(
                                            "POST",
                                            conta + "/devolucoes",
                                            p.c.token,
                                            new EntradaDevolucao(
                                                    devolucao,
                                                    recebimento,
                                                    "10.00",
                                                    "Abatimento aprovado"))
                                    .getStatus())
                    .isEqualTo(200);
            if (confirmar)
                assertThat(
                                p.c.enviar(
                                                "POST",
                                                conta + "/devolucoes/" + devolucao + "/confirmar",
                                                p.c.token,
                                                new ConfirmarDevolucao(UUID.randomUUID()))
                                        .getStatus())
                        .isEqualTo(200);
            assertThat(p.acao(pedido, "cancelar", p.c.token, List.of(opcao)).getStatus())
                    .isEqualTo(409);
            pedido = p.acao(pedido, "cancelar", p.unidades(pedido));
            dados = p.c.json(p.c.enviar("GET", conta, p.c.token, null));
            assertThat(dados.get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
            assertThat(
                            p.c.enviar(
                                            "POST",
                                            conta + "/devolucoes",
                                            p.c.token,
                                            new EntradaDevolucao(
                                                    UUID.randomUUID(),
                                                    recebimento,
                                                    "30.00",
                                                    "Cancelamento do combo"))
                                    .getStatus())
                    .isEqualTo(200);
            assertThat(
                            p.c.enviar(
                                            "POST",
                                            conta + "/devolucoes",
                                            p.c.token,
                                            new EntradaDevolucao(
                                                    UUID.randomUUID(),
                                                    recebimento,
                                                    "0.01",
                                                    "Excedente inválido"))
                                    .getStatus())
                    .isEqualTo(409);
            dados = p.c.json(p.c.enviar("GET", conta, p.c.token, null));
            assertThat(
                            new BigDecimal(dados.get("reservado").asText())
                                    .add(
                                            new BigDecimal(
                                                    dados.get("saldo")
                                                            .get("devolvidoConfirmado")
                                                            .asText())))
                    .isEqualByComparingTo("40.00");
        }
    }
}
