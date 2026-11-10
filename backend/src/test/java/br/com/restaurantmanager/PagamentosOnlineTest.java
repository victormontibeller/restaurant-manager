package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import br.com.restaurantmanager.financeiro.services.DevolucaoOnlineService;
import br.com.restaurantmanager.pagamentos.dtos.CheckoutRegistro;
import br.com.restaurantmanager.pagamentos.dtos.CredencialPagamento;
import br.com.restaurantmanager.pagamentos.dtos.SituacaoProvedor;
import br.com.restaurantmanager.pagamentos.infrastructure.GatewayPagamento;
import br.com.restaurantmanager.pagamentos.infrastructure.ProtecaoPagamento;
import br.com.restaurantmanager.pagamentos.services.CheckoutService;
import br.com.restaurantmanager.pagamentos.services.ConexaoPagamentoService;
import br.com.restaurantmanager.pagamentos.services.InboxPagamentoService;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.tenancy.context.TenantScope;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.Duration;
import java.util.Base64;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

@SpringBootTest(
        properties = {
            "rm.stage=test",
            "rm.pagamentos.client-id=ficticio",
            "rm.pagamentos.client-secret=apenas-simulacao"
        })
@AutoConfigureMockMvc
class PagamentosOnlineTest {
    private static final MercadoPagoSimulado PROVEDOR;

    static {
        try {
            PROVEDOR = new MercadoPagoSimulado();
        } catch (Exception erro) {
            throw new ExceptionInInitializerError(erro);
        }
    }

    @DynamicPropertySource
    static void propriedades(DynamicPropertyRegistry r) {
        byte[] chave = new byte[32];
        new SecureRandom().nextBytes(chave);
        r.add("rm.pagamentos.secret", () -> Base64.getEncoder().encodeToString(chave));
        r.add("rm.pagamentos.test-base-url", PROVEDOR::url);
        r.add("rm.pagamentos.webhook-secret", () -> "assinatura-apenas-simulacao-local");
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired CheckoutService checkout;
    @Autowired DevolucaoOnlineService devolucoes;
    @Autowired ProtecaoPagamento protecao;
    @Autowired InboxPagamentoService inbox;
    @Autowired ConexaoPagamentoService conexoes;
    @MockitoSpyBean GatewayPagamento gateway;
    private PedidosCenario p;
    private final List<UUID> eventosCriados = new ArrayList<>();

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @AfterAll
    static void encerrar() {
        PROVEDOR.close();
    }

    @BeforeEach
    void cenario() throws Exception {
        p = new PedidosCenario(mvc, mapper);
        String token = UUID.randomUUID().toString();
        String vendedor = UUID.randomUUID().toString();
        PROVEDOR.vendedores.put(token, vendedor);
        UUID id = UUID.randomUUID();
        String cifra;
        try (var scope = TenantScope.open(p.c.schema)) {
            cifra =
                    protecao.cifrar(
                            id,
                            mapper.writeValueAsString(
                                    new CredencialPagamento(
                                            token,
                                            UUID.randomUUID().toString(),
                                            vendedor,
                                            Instant.now().plusSeconds(3600))));
        }
        try (var c = p.banco();
                var s =
                        c.prepareStatement(
                                "insert into "
                                        + p.c.schema
                                        + ".mp_conexao(id,vendedor,credencial,expira_em) values"
                                        + " (?,?,?,now()+interval '1 hour')")) {
            s.setObject(1, id);
            s.setString(2, vendedor);
            s.setString(3, cifra);
            s.executeUpdate();
        }
    }

    @AfterEach
    void limpar() throws Exception {
        for (UUID id : eventosCriados)
            p.c.executar("delete from public.mp_inbox where id='" + id + "'");
        p.c.executar(
                "delete from public.mp_inbox where recurso in (select recurso from"
                        + " public.mp_recurso where empresa_id='"
                        + p.c.empresa
                        + "')");
        p.c.executar("delete from public.mp_recurso where empresa_id='" + p.c.empresa + "'");
        p.close();
    }

    private JsonNode enviar() throws Exception {
        var e = p.entrada(1);
        return p.enviar(
                new EnviarPedido(
                        e.intencaoId(),
                        e.unidadeId(),
                        e.canal(),
                        null,
                        e.revisao(),
                        e.linhas(),
                        e.observacao(),
                        null,
                        null,
                        "ONLINE"));
    }

    private void processar() {
        try (var scope = TenantScope.open(p.c.schema)) {
            var trabalho = checkout.reivindicar();
            assertThat(trabalho).isNotNull();
            checkout.processar(trabalho);
        }
    }

    private void antecipar() throws Exception {
        p.c.executar("update " + p.c.schema + ".pagamento_checkout set proximo_em=now()");
    }

    private String externo(JsonNode pedido) {
        return PROVEDOR.orders.entrySet().stream()
                .filter(
                        e ->
                                pedido.get("id")
                                        .asText()
                                        .equals(e.getValue().get("external_reference")))
                .findFirst()
                .orElseThrow()
                .getKey();
    }

    @Test
    void retornoNaoConfirmaPagamentoEConsultaConfiavelIniciaAceite() throws Exception {
        var pedido = enviar();
        assertThat(pedido.get("estado").asText()).isEqualTo("AGUARDANDO_PAGAMENTO");
        assertThat(pedido.get("alertarEm").isNull()).isTrue();
        processar();
        assertThat(p.detalhe(pedido).get("estado").asText()).isEqualTo("AGUARDANDO_PAGAMENTO");
        long eventosAguardando = eventosCheckoutCliente(pedido);
        assertThat(eventosAguardando).isEqualTo(1);
        antecipar();
        processar();
        assertThat(eventosCheckoutCliente(pedido)).isEqualTo(eventosAguardando);
        assertThat(
                        p.c.enviar(
                                        "GET",
                                        "/api/v1/me/pedidos/"
                                                + pedido.get("id").asText()
                                                + "/pagamento?status=approved",
                                        p.tokenCliente,
                                        null)
                                .getStatus())
                .isEqualTo(200);
        assertThat(p.contar("recebimento")).isZero();
        PROVEDOR.aprovar(externo(pedido));
        antecipar();
        processar();
        pedido = p.detalhe(pedido);
        assertThat(pedido.get("estado").asText()).isEqualTo("AGUARDANDO_ACEITE");
        assertThat(pedido.get("saldo").get("pagoConfirmado").asText()).isEqualTo("20.00");
        assertThat(pedido.get("alertarEm").isNull()).isFalse();
        antecipar(); // Replay por evento autenticado não duplica o recebimento.
        p.c.executar("update " + p.c.schema + ".pagamento_checkout set estado='EM_RECONCILIACAO'");
        processar();
        assertThat(p.contar("recebimento")).isEqualTo(1);
    }

    @Test
    void perdaDeRespostaAposCriacaoRecuperaMesmaCobrancaAntesDeRepetir() throws Exception {
        var pedido = enviar();
        PROVEDOR.perderCriacao.set(true);
        try (var scope = TenantScope.open(p.c.schema)) {
            var trabalho = checkout.reivindicar();
            try {
                checkout.processar(trabalho);
            } catch (RuntimeException erro) {
                checkout.falhar(trabalho, erro);
            }
        }
        assertThat(
                        PROVEDOR.orders.values().stream()
                                .filter(
                                        o ->
                                                pedido.get("id")
                                                        .asText()
                                                        .equals(o.get("external_reference")))
                                .count())
                .isEqualTo(1);
        antecipar();
        processar();
        assertThat(
                        PROVEDOR.orders.values().stream()
                                .filter(
                                        o ->
                                                pedido.get("id")
                                                        .asText()
                                                        .equals(o.get("external_reference")))
                                .count())
                .isEqualTo(1);
        assertThat(p.contar("recebimento")).isZero();
    }

    @Test
    void timeoutRealDaCobrancaPreservaIntencaoEReconciliaEfeitoRemotoUnico() throws Exception {
        var pedido = enviar();
        try (var atraso = new MercadoPagoSimulado.AtrasoResposta();
                var scope = TenantScope.open(p.c.schema)) {
            PROVEDOR.atrasarCriacao.set(atraso);
            var trabalho = checkout.reivindicar();
            assertThat(trabalho).isNotNull();
            long inicio = System.nanoTime();
            RuntimeException erro = catchThrowableOfType(() -> checkout.processar(trabalho), RuntimeException.class);
            assertThat(erro).isNotNull();
            assertThat(Duration.ofNanos(System.nanoTime() - inicio).toMillis())
                    .isGreaterThanOrEqualTo(9500).isLessThan(30000);
            assertThat(atraso.efeitoPersistido.getCount()).isZero();
            assertThat(atraso.liberar.getCount()).isEqualTo(1);
            assertThat(atraso.watchdogExpirou.get()).isFalse();
            assertThat(atraso.aguardandoResposta.get()).isTrue();
            checkout.falhar(trabalho, erro);
        } finally {
            PROVEDOR.atrasarCriacao.set(null);
        }
        assertThat(p.contar("pagamento_checkout where estado='EM_RECONCILIACAO'")).isEqualTo(1);
        assertThat(p.contar("recebimento")).isZero();
        antecipar();
        processar();
        assertThat(p.contar("pagamento_checkout where estado='AGUARDANDO'")).isEqualTo(1);
        assertThat(PROVEDOR.orders.values().stream()
                .filter(o -> pedido.get("id").asText().equals(o.get("external_reference"))).count()).isEqualTo(1);
        assertThat(p.contar("recebimento")).isZero();
    }

    @Test
    void timeoutRealDaDevolucaoMantemReservaEReconciliaSemRepetirEstorno() throws Exception {
        var pedido = enviar();
        processar();
        PROVEDOR.aprovar(externo(pedido));
        antecipar();
        processar();
        pedido = p.detalhe(pedido);
        assertThat(p.c.enviar("POST", "/api/v1/me/pedidos/" + pedido.get("id").asText() + "/cancelar",
                p.tokenCliente, p.comando(pedido, List.of())).getStatus()).isEqualTo(200);
        try (var atraso = new MercadoPagoSimulado.AtrasoResposta();
                var scope = TenantScope.open(p.c.schema)) {
            PROVEDOR.atrasarDevolucao.set(atraso);
            var trabalho = devolucoes.reivindicar();
            assertThat(trabalho).isNotNull();
            long inicio = System.nanoTime();
            RuntimeException erro = catchThrowableOfType(() -> devolucoes.processar(trabalho), RuntimeException.class);
            assertThat(erro).isNotNull();
            assertThat(Duration.ofNanos(System.nanoTime() - inicio).toMillis())
                    .isGreaterThanOrEqualTo(9500).isLessThan(30000);
            assertThat(atraso.efeitoPersistido.getCount()).isZero();
            assertThat(atraso.liberar.getCount()).isEqualTo(1);
            assertThat(atraso.watchdogExpirou.get()).isFalse();
            assertThat(atraso.aguardandoResposta.get()).isTrue();
            devolucoes.falhar(trabalho, erro);
        } finally {
            PROVEDOR.atrasarDevolucao.set(null);
        }
        assertThat(p.contar("devolucao where estado='EM_RECONCILIACAO'")).isEqualTo(1);
        assertThat(p.detalhe(pedido).get("saldo").get("pendenciaFinanceira").asBoolean()).isTrue();
        String financeiro = "/api/v1/financeiro/pedidos/" + pedido.get("id").asText();
        var respostaFinanceira = p.c.enviar("GET", financeiro, p.c.token, null);
        assertThat(respostaFinanceira.getStatus()).isEqualTo(200);
        var reserva = p.c.json(respostaFinanceira);
        assertThat(reserva.get("reservado").asText()).isEqualTo("20.00");
        assertThat(reserva.get("saldo").get("devolvidoConfirmado").asText()).isEqualTo("0.00");
        p.c.executar("update " + p.c.schema + ".devolucao set proximo_em=now()");
        try (var scope = TenantScope.open(p.c.schema)) {
            devolucoes.processar(devolucoes.reivindicar());
        }
        assertThat(p.contar("devolucao where estado='CONFIRMADA'")).isEqualTo(1);
        assertThat(p.detalhe(pedido).get("saldo").get("devolvidoConfirmado").asText()).isEqualTo("20.00");
        // A devolução confirma primeiro; o checkout ainda exige a consulta confiável agendada.
        assertThat(p.detalhe(pedido).get("saldo").get("pendenciaFinanceira").asBoolean()).isTrue();
        antecipar();
        processar();
        assertThat(p.detalhe(pedido).get("saldo").get("pendenciaFinanceira").asBoolean()).isFalse();
        var confirmada = p.c.enviar("GET", financeiro, p.c.token, null);
        assertThat(confirmada.getStatus()).isEqualTo(200);
        assertThat(p.c.json(confirmada).get("reservado").asText()).isEqualTo("0.00");
        assertThat(p.contar("devolucao where estado='CONFIRMADA'")).isEqualTo(1);
        assertThat(mapper.valueToTree(PROVEDOR.orders.get(externo(pedido)).get("transactions"))
                .get("refunds").size()).isEqualTo(1);
    }

    @Test
    void cancelamentoPagoReservaEReconciliaDevolucaoAposRespostaPerdida() throws Exception {
        var pedido = enviar();
        processar();
        PROVEDOR.aprovar(externo(pedido));
        antecipar();
        processar();
        pedido = p.detalhe(pedido);
        var cancelado =
                p.c.enviar(
                        "POST",
                        "/api/v1/me/pedidos/" + pedido.get("id").asText() + "/cancelar",
                        p.tokenCliente,
                        p.comando(pedido, List.of()));
        assertThat(cancelado.getStatus()).isEqualTo(200);
        assertThat(p.contar("devolucao")).isEqualTo(1);
        PROVEDOR.perderDevolucao.set(true);
        try (var scope = TenantScope.open(p.c.schema)) {
            var trabalho = devolucoes.reivindicar();
            assertThat(trabalho).isNotNull();
            assertThatThrownBy(() -> devolucoes.processar(trabalho))
                    .isInstanceOf(RuntimeException.class);
            devolucoes.falhar(trabalho, new IllegalStateException());
        }
        p.c.executar("update " + p.c.schema + ".devolucao set proximo_em=now()");
        try (var scope = TenantScope.open(p.c.schema)) {
            devolucoes.processar(devolucoes.reivindicar());
        }
        var saldo = p.detalhe(pedido).get("saldo");
        assertThat(saldo.get("devolvidoConfirmado").asText()).isEqualTo("20.00");
        assertThat(saldo.get("saldoADevolver").asText()).isEqualTo("0.00");
        assertThat(p.detalhe(pedido).get("estado").asText()).isEqualTo("CANCELADO");
        long eventosAntes = eventosCheckoutCliente(pedido);
        antecipar();
        processar();
        assertThat(p.detalhe(pedido).get("saldo").get("pendenciaFinanceira").asBoolean()).isFalse();
        assertThat(eventosCheckoutCliente(pedido)).isEqualTo(eventosAntes + 1);
    }

    private long eventosCheckoutCliente(JsonNode pedido) throws Exception {
        try (var c = p.banco();
                var s =
                        c.prepareStatement(
                                "select count(*) from "
                                        + p.c.schema
                                        + ".evento_operacional where tipo='CHECKOUT_ATUALIZADO'"
                                        + " and pedido_id=? and fluxo=?")) {
            s.setObject(1, UUID.fromString(pedido.get("id").asText()));
            s.setString(2, "cliente:" + CatalogoCenario.UNIDADE + ":" + p.cliente);
            try (var r = s.executeQuery()) {
                r.next();
                return r.getLong(1);
            }
        }
    }

    @Test
    void pagamentoTardioNaoReativaPedidoCanceladoEReservaDevolucao() throws Exception {
        var pedido = enviar();
        processar();
        String id = externo(pedido);
        p.c.executar(
                "update "
                        + p.c.schema
                        + ".pedido set pagamento_expira_em=now()-interval '1 second' where id='"
                        + pedido.get("id").asText()
                        + "'");
        PROVEDOR.aprovar(id);
        antecipar();
        processar();
        var atual = p.detalhe(pedido);
        assertThat(atual.get("estado").asText()).isEqualTo("CANCELADO");
        assertThat(atual.get("saldo").get("pagoConfirmado").asText()).isEqualTo("20.00");
        assertThat(atual.get("saldo").get("saldoADevolver").asText()).isEqualTo("20.00");
        assertThat(p.contar("devolucao")).isEqualTo(1);
    }

    @Test
    void assinaturaInvalidaReplayEEventoForaDeOrdemNaoDuplicamPagamento() throws Exception {
        var pedido = enviar();
        processar();
        String id = externo(pedido);
        String request = UUID.randomUUID().toString();
        String ts = "1700000000";
        var mac = Mac.getInstance("HmacSHA256");
        mac.init(
                new SecretKeySpec(
                        "assinatura-apenas-simulacao-local".getBytes(StandardCharsets.UTF_8),
                        "HmacSHA256"));
        String assinatura =
                "ts="
                        + ts
                        + ",v1="
                        + HexFormat.of()
                                .formatHex(
                                        mac.doFinal(
                                                ("id:"
                                                                + id.toLowerCase(Locale.ROOT)
                                                                + ";request-id:"
                                                                + request
                                                                + ";ts:"
                                                                + ts
                                                                + ";")
                                                        .getBytes(StandardCharsets.UTF_8)));
        var rota =
                org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post(
                                "/api/v1/webhooks/mercadopago")
                        .param("data.id", id)
                        .header("x-request-id", request)
                        .header("x-signature", "ts=" + ts + ",v1=invalida");
        assertThat(mvc.perform(rota).andReturn().getResponse().getStatus()).isEqualTo(403);
        PROVEDOR.aprovar(id);
        for (int i = 0; i < 2; i++)
            assertThat(
                            mvc.perform(
                                            org.springframework.test.web.servlet.request
                                                    .MockMvcRequestBuilders.post(
                                                            "/api/v1/webhooks/mercadopago")
                                                    .param("data.id", id)
                                                    .header("x-request-id", request)
                                                    .header("x-signature", assinatura)
                                                    .contentType("application/json")
                                                    .content(
                                                            "{\"tenant\":\"arbitrario\",\"status\":\"failed\"}"))
                                    .andReturn()
                                    .getResponse()
                                    .getStatus())
                    .isEqualTo(204);
        inbox.encaminhar();
        processar();
        assertThat(p.detalhe(pedido).get("estado").asText()).isEqualTo("AGUARDANDO_ACEITE");
        assertThat(p.contar("recebimento")).isEqualTo(1);
        // Um novo aviso atrasado apenas acorda uma consulta, sem usar o status do corpo.
        antecipar();
        p.c.executar("update " + p.c.schema + ".pagamento_checkout set estado='EM_RECONCILIACAO'");
        processar();
        assertThat(p.contar("recebimento")).isEqualTo(1);
    }

    private Map<String, String> parametros(String url) {
        var valores = new HashMap<String, String>();
        for (String par : URI.create(url).getRawQuery().split("&")) {
            var partes = par.split("=", 2);
            valores.put(partes[0], URLDecoder.decode(partes[1], StandardCharsets.UTF_8));
        }
        return valores;
    }

    @Test
    void oauthExigeAdministradorReautenticadoPkceStateESessaoVigente() throws Exception {
        String rota = "/api/v1/integracoes/mercadopago/autorizar";
        assertThat(p.c.enviar("POST", rota, p.tokenCliente, null).getStatus()).isEqualTo(403);
        assertThat(p.c.enviar("POST", rota, p.c.token, null).getStatus()).isEqualTo(403);
        p.c.executar(
                "update "
                        + p.c.schema
                        + ".sessao set reautenticada_em=now() where usuario_id='"
                        + p.c.administrador
                        + "'");
        var r = p.c.enviar("POST", rota, p.c.token, null);
        assertThat(r.getStatus()).as(r.getContentAsString()).isEqualTo(200);
        var q = parametros(p.c.json(r).get("url").asText());
        assertThat(q.get("scope")).isEqualTo("read write offline_access");
        String code = UUID.randomUUID().toString();
        PROVEDOR.codigos.put(
                code,
                Map.of(
                        "desafio",
                        q.get("code_challenge"),
                        "retorno",
                        q.get("redirect_uri"),
                        "vendedor",
                        "VENDEDOR_OAUTH_" + UUID.randomUUID()));
        String callback =
                "/api/v1/integracoes/mercadopago/retorno?state=" + q.get("state") + "&code=" + code;
        assertThat(p.c.enviar("GET", callback, null, null).getStatus()).isEqualTo(303);
        assertThat(p.c.enviar("GET", callback, null, null).getStatus()).isEqualTo(503);
        var status = p.c.enviar("GET", "/api/v1/integracoes/mercadopago", p.c.token, null);
        assertThat(status.getStatus()).isEqualTo(200);
        assertThat(status.getContentAsString())
                .doesNotContain("accessToken", "refreshToken", "credencial");
        r = p.c.enviar("POST", rota, p.c.token, null);
        q = parametros(p.c.json(r).get("url").asText());
        p.c.executar(
                "update "
                        + p.c.schema
                        + ".sessao set revogada_em=now() where usuario_id='"
                        + p.c.administrador
                        + "'");
        assertThat(
                        p.c.enviar(
                                        "GET",
                                        "/api/v1/integracoes/mercadopago/retorno?state="
                                                + q.get("state")
                                                + "&code=ficticio",
                                        null,
                                        null)
                                .getStatus())
                .isEqualTo(401);
    }

    @Test
    void sdkIsolaCredenciaisSimultaneasERenovacaoNaoReutilizaRefresh() throws Exception {
        var a =
                new CredencialPagamento(
                        UUID.randomUUID().toString(),
                        UUID.randomUUID().toString(),
                        "A" + UUID.randomUUID(),
                        Instant.now().plusSeconds(3600));
        var b =
                new CredencialPagamento(
                        UUID.randomUUID().toString(),
                        UUID.randomUUID().toString(),
                        "B" + UUID.randomUUID(),
                        Instant.now().plusSeconds(3600));
        PROVEDOR.vendedores.put(a.accessToken(), a.vendedor());
        PROVEDOR.vendedores.put(b.accessToken(), b.vendedor());
        try (var executor = Executors.newFixedThreadPool(2)) {
            var tarefas =
                    executor.<SituacaoProvedor>invokeAll(
                            List.of(
                                    () ->
                                            gateway.criar(
                                                    a,
                                                    UUID.randomUUID(),
                                                    "20.00",
                                                    900,
                                                    "https://a.localhost/"),
                                    () ->
                                            gateway.criar(
                                                    b,
                                                    UUID.randomUUID(),
                                                    "30.00",
                                                    900,
                                                    "https://b.localhost/")));
            assertThat(tarefas.get(0).get().vendedor()).isEqualTo(a.vendedor());
            assertThat(tarefas.get(1).get().vendedor()).isEqualTo(b.vendedor());
            assertThatThrownBy(() -> gateway.consultar(b, tarefas.get(0).get().id()))
                    .isInstanceOf(RuntimeException.class);
        }
        UUID id;
        try (var c = p.banco();
                var s = c.createStatement();
                var r =
                        s.executeQuery(
                                "select id,credencial from "
                                        + p.c.schema
                                        + ".mp_conexao where ativa")) {
            r.next();
            id = r.getObject(1, UUID.class);
            try (var scope = TenantScope.open(p.c.schema)) {
                var atual =
                        mapper.readValue(
                                protecao.decifrar(id, r.getString(2)), CredencialPagamento.class);
                PROVEDOR.renovacoes.put(atual.refreshToken(), atual.vendedor());
            }
        }
        p.c.executar(
                "update " + p.c.schema + ".mp_conexao set expira_em=now()-interval '1 second'");
        int antes = PROVEDOR.refreshes.get();
        try (var executor = Executors.newFixedThreadPool(2)) {
            var tarefas =
                    executor.invokeAll(
                            List.of(
                                    () -> {
                                        try (var scope = TenantScope.open(p.c.schema)) {
                                            try {
                                                conexoes.credencial(id);
                                                return true;
                                            } catch (RuntimeException e) {
                                                return false;
                                            }
                                        }
                                    },
                                    () -> {
                                        try (var scope = TenantScope.open(p.c.schema)) {
                                            try {
                                                conexoes.credencial(id);
                                                return true;
                                            } catch (RuntimeException e) {
                                                return false;
                                            }
                                        }
                                    }));
            assertThat(List.of(tarefas.get(0).get(), tarefas.get(1).get())).contains(true);
        }
        assertThat(PROVEDOR.refreshes.get() - antes).isEqualTo(1);
    }

    @Test
    void gerenteReconciliaSemNovaIntencaoECozinhaNaoAcessaFila() throws Exception {
        var pedido = enviar();
        String fila = "/api/v1/operacao/pagamentos?unidadeId=" + CatalogoCenario.UNIDADE;
        assertThat(p.c.enviar("GET", fila, p.funcionario("COZINHA"), null).getStatus())
                .isEqualTo(403);
        String gerente = p.funcionario("GERENTE");
        assertThat(p.c.enviar("GET", fila, gerente, null).getStatus()).isEqualTo(200);
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        "/api/v1/operacao/pagamentos/checkout/"
                                                + pedido.get("id").asText()
                                                + "/reconciliar",
                                        gerente,
                                        null)
                                .getStatus())
                .isEqualTo(204);
        assertThat(p.contar("pagamento_checkout")).isEqualTo(1);
    }

    @Test
    void reconciliacaoDelegadaRevalidaMesmoJwtUnidadeETenantAntesDeAlterarFila() throws Exception {
        var pedido = enviar();
        String fila = "/api/v1/operacao/pagamentos?unidadeId=" + CatalogoCenario.UNIDADE;
        String rota = "/api/v1/operacao/pagamentos/checkout/" + pedido.get("id").asText() + "/reconciliar";
        String caixa = p.funcionario("CAIXA");
        assertThat(p.c.enviar("GET", fila, caixa, null).getStatus()).isEqualTo(403);
        assertThat(p.c.enviar("POST", rota, caixa, null).getStatus()).isEqualTo(403);
        assertThat(p.contar("pagamento_checkout where estado='SOLICITADO'")).isEqualTo(1);
        p.c.reautenticar();
        p.c.configurarAcoes("CAIXA", List.of("pagamento.reconciliar"));
        var restrito = p.c.usuario("CAIXA");
        p.c.vincular(restrito, CatalogoCenario.OUTRA_UNIDADE);
        String outraUnidade = p.c.login(restrito);
        assertThat(p.c.enviar("GET", fila, outraUnidade, null).getStatus()).isEqualTo(404);
        assertThat(p.c.enviar("POST", rota, outraUnidade, null).getStatus()).isEqualTo(404);
        try (var outro = new CatalogoCenario(mvc, mapper)) {
            assertThat(outro.enviar("POST", rota, outro.token, null).getStatus()).isEqualTo(404);
            assertThat(outro.enviar("GET", fila, caixa, null).getStatus()).isEqualTo(401);
            assertThat(outro.json(outro.enviar("GET", fila, outro.token, null)).size()).isZero();
        }
        assertThat(p.c.enviar("GET", fila, caixa, null).getStatus()).isEqualTo(200);
        assertThat(p.c.enviar("POST", rota, caixa, null).getStatus()).isEqualTo(204);
        assertThat(p.contar("pagamento_checkout where estado='EM_RECONCILIACAO'")).isEqualTo(1);
        long auditoria = p.contar("auditoria_acesso where evento='PAGAMENTO_RECONCILIACAO_SOLICITADA'");
        assertThat(auditoria).isEqualTo(1);
        p.c.configurarAcoes("CAIXA", List.of("pedido.consultar"));
        assertThat(p.c.enviar("GET", fila, caixa, null).getStatus()).isEqualTo(403);
        assertThat(p.c.enviar("POST", rota, caixa, null).getStatus()).isEqualTo(403);
        assertThat(p.contar("pagamento_checkout")).isEqualTo(1);
        assertThat(p.contar("auditoria_acesso where evento='PAGAMENTO_RECONCILIACAO_SOLICITADA'")).isEqualTo(auditoria);
    }

    @Test
    void webhookDaRecusadaSubstituidaReconciliaSemColidirENaoCriaTentativaJaLiquidada() throws Exception {
        var pedido = enviar();
        String antigo = recusar(pedido);
        UUID nova = novaTentativa(pedido);
        assertThat(p.contar("pagamento_checkout where substituida")).isEqualTo(1);
        assertThat(p.contar("pagamento_checkout where not substituida and estado='SOLICITADO'")).isEqualTo(1);

        PROVEDOR.aprovar(antigo);
        UUID evento = registrarInbox(antigo);
        inbox.encaminhar();
        assertThat(inboxProcessada(evento)).isTrue();
        processarIntencao(UUID.fromString(pedido.get("id").asText()));
        processarIntencao(nova);

        assertThat(p.detalhe(pedido).get("estado").asText()).isEqualTo("AGUARDANDO_ACEITE");
        assertThat(p.detalhe(pedido).get("saldo").get("pagoConfirmado").asText()).isEqualTo("20.00");
        assertThat(p.contar("recebimento")).isEqualTo(1);
        assertThat(p.contar("pagamento_checkout where id='" + nova + "' and estado='RECUSADO' and not enviado")).isEqualTo(1);
        verify(gateway, never()).criar(any(), eq(nova), anyString(), anyInt(), anyString());
        // Repetição tardia mantém o mesmo recebimento e não libera uma terceira intenção.
        registrarInbox(antigo);
        inbox.encaminhar();
        processarIntencao(UUID.fromString(pedido.get("id").asText()));
        assertThat(p.contar("recebimento")).isEqualTo(1);
        assertThat(p.c.enviar("POST", rotaTentativa(pedido, UUID.randomUUID()), p.tokenCliente, null).getStatus()).isEqualTo(409);
    }

    @Test
    void pagamentoAntigoDuranteHttpDaNovaTentativaReservaSomenteExcedenteSemLockExterno() throws Exception {
        var pedido = enviar();
        String antigo = recusar(pedido);
        UUID nova = novaTentativa(pedido);
        var novaPaga = new CountDownLatch(1);
        var liberarResposta = new CountDownLatch(1);
        doAnswer(invocacao -> {
            var resultado = (SituacaoProvedor) invocacao.callRealMethod();
            PROVEDOR.aprovar(resultado.id());
            novaPaga.countDown();
            if (!liberarResposta.await(10, TimeUnit.SECONDS))
                throw new AssertionError("O teste não liberou o resultado do pagamento concorrente.");
            return gateway.consultar(invocacao.getArgument(0), resultado.id());
        }).when(gateway).criar(any(), eq(nova), anyString(), anyInt(), anyString());

        try (var executor = Executors.newSingleThreadExecutor()) {
            var processamento = executor.submit(() -> {
                processarIntencao(nova);
                return null;
            });
            try {
                assertThat(novaPaga.await(10, TimeUnit.SECONDS)).isTrue();
                PROVEDOR.aprovar(antigo);
                registrarInbox(antigo);
                inbox.encaminhar();
                // Precisa concluir enquanto o outro worker aguarda HTTP: pedido/cobrança estão livres.
                processarIntencao(UUID.fromString(pedido.get("id").asText()));
                assertThat(p.detalhe(pedido).get("saldo").get("pagoConfirmado").asText()).isEqualTo("20.00");
            } finally {
                liberarResposta.countDown();
            }
            processamento.get(20, TimeUnit.SECONDS);
        }
        var saldo = p.detalhe(pedido).get("saldo");
        assertThat(saldo.get("pagoConfirmado").asText()).isEqualTo("40.00");
        assertThat(saldo.get("saldoADevolver").asText()).isEqualTo("20.00");
        assertThat(p.contar("recebimento")).isEqualTo(2);
        assertThat(p.contar("devolucao where valor=20 and estado='SOLICITADA'")).isEqualTo(1);
        try (var scope = TenantScope.open(p.c.schema)) {
            devolucoes.processar(devolucoes.reivindicar());
        }
        // A reserva escolhe o primeiro recebimento, que foi o da intenção antiga.
        processarIntencao(UUID.fromString(pedido.get("id").asText()));
        registrarInbox(antigo);
        inbox.encaminhar();
        processarIntencao(UUID.fromString(pedido.get("id").asText()));
        assertThat(p.contar("recebimento")).isEqualTo(2);
        assertThat(p.contar("devolucao where valor=20 and estado='CONFIRMADA'")).isEqualTo(1);
        assertThat(p.detalhe(pedido).get("saldo").get("saldoADevolver").asText()).isEqualTo("0.00");
    }

    @Test
    void tentativaEnviadaSemResultadoNaBuscaNaoRepeteCriacao() throws Exception {
        var pedido = enviar();
        UUID id = UUID.fromString(pedido.get("id").asText());
        p.c.executar("update " + p.c.schema + ".pagamento_checkout set enviado=true");
        try (var scope = TenantScope.open(p.c.schema)) {
            var trabalho = checkout.reivindicar();
            RuntimeException erro = catchThrowableOfType(() -> checkout.processar(trabalho), RuntimeException.class);
            assertThat(erro).hasMessageContaining("sem nova criação");
            checkout.falhar(trabalho, erro);
        }
        assertThat(p.contar("pagamento_checkout where enviado and estado='EM_RECONCILIACAO'")).isEqualTo(1);
        verify(gateway, never()).criar(any(), eq(id), anyString(), anyInt(), anyString());
    }

    @Test
    void perdaDeLeaseDuranteBuscaImpedePostDeCriacaoDoWorkerAntigo() throws Exception {
        var pedido = enviar();
        UUID id = UUID.fromString(pedido.get("id").asText());
        UUID novaLease = UUID.randomUUID();
        var buscaConcluida = new CountDownLatch(1);
        var liberarBusca = new CountDownLatch(1);
        doAnswer(invocacao -> {
            Object resultado = invocacao.callRealMethod();
            buscaConcluida.countDown();
            if (!liberarBusca.await(10, TimeUnit.SECONDS))
                throw new AssertionError("O teste não liberou a busca após trocar a lease.");
            return resultado;
        }).when(gateway).buscar(any(), eq(id), any());

        try (var executor = Executors.newSingleThreadExecutor()) {
            var processamento = executor.submit(() -> {
                processarIntencao(id);
                return null;
            });
            try {
                assertThat(buscaConcluida.await(10, TimeUnit.SECONDS)).isTrue();
                p.c.executar("update " + p.c.schema + ".pagamento_checkout set lease_id='" + novaLease
                        + "',lease_ate=now()+interval '2 minutes' where id='" + id + "'");
            } finally {
                liberarBusca.countDown();
            }
            processamento.get(20, TimeUnit.SECONDS);
        }
        verify(gateway, never()).criar(any(), eq(id), anyString(), anyInt(), anyString());
        assertThat(p.contar("pagamento_checkout where not enviado and lease_id='" + novaLease + "'")).isEqualTo(1);
    }

    @Test
    void reconciliarTentativaSubstituidaSemEnvioNaoCriaCobranca() throws Exception {
        var pedido = enviar();
        UUID antiga = UUID.fromString(pedido.get("id").asText());
        // Intenção comprovadamente não enviada, recusada por uma execução anterior.
        p.c.executar("update " + p.c.schema + ".pagamento_checkout set estado='RECUSADO'");
        novaTentativa(pedido);
        String rota = "/api/v1/operacao/pagamentos/checkout/" + antiga + "/reconciliar";
        assertThat(p.c.enviar("POST", rota, p.c.token, null).getStatus()).isEqualTo(204);
        processarIntencao(antiga);
        assertThat(p.contar("pagamento_checkout where substituida and estado='RECUSADO' and not enviado")).isEqualTo(1);
        verify(gateway, never()).criar(any(), eq(antiga), anyString(), anyInt(), anyString());
    }

    @Test
    void duasNovasTentativasConcorrentesPreservamUnicaVigenteEIdempotencia() throws Exception {
        var pedido = enviar();
        recusar(pedido);
        UUID primeira = UUID.randomUUID(), segunda = UUID.randomUUID();
        var iniciar = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> {
                assertThat(iniciar.await(10, TimeUnit.SECONDS)).isTrue();
                return p.c.enviar("POST", rotaTentativa(pedido, primeira), p.tokenCliente, null).getStatus();
            });
            var b = executor.submit(() -> {
                assertThat(iniciar.await(10, TimeUnit.SECONDS)).isTrue();
                return p.c.enviar("POST", rotaTentativa(pedido, segunda), p.tokenCliente, null).getStatus();
            });
            iniciar.countDown();
            int resultadoA = a.get(20, TimeUnit.SECONDS), resultadoB = b.get(20, TimeUnit.SECONDS);
            assertThat(List.of(resultadoA, resultadoB)).containsExactlyInAnyOrder(200, 409);
            UUID aceita = resultadoA == 200 ? primeira : segunda;
            assertThat(p.c.enviar("POST", rotaTentativa(pedido, aceita), p.tokenCliente, null).getStatus()).isEqualTo(200);
        }
        assertThat(p.contar("pagamento_checkout")).isEqualTo(2);
        assertThat(p.contar("pagamento_checkout where not substituida")).isEqualTo(1);
        assertThat(p.contar("pagamento_checkout where substituida and estado='RECUSADO'")).isEqualTo(1);
    }

    @Test
    void falhaSqlDeUmEventoNaoReverteOutroTenantERetryTemBackoffLimitado() throws Exception {
        var pedido = enviar();
        processar();
        String valido = externo(pedido);
        PROVEDOR.aprovar(valido);
        try (var outro = new CatalogoCenario(mvc, mapper)) {
            String quebrado = "RECURSO" + UUID.randomUUID().toString().replace("-", "");
            outro.executar("insert into public.mp_recurso(recurso,empresa_id) values ('" + quebrado.toLowerCase(Locale.ROOT) + "','" + outro.empresa + "')");
            UUID eventoRuim = registrarInbox(quebrado);
            UUID eventoBom = registrarInbox(valido);
            outro.executar("alter table " + outro.schema + ".pagamento_checkout rename to checkout_indisponivel");
            try {
                inbox.encaminhar();
                assertThat(inboxProcessada(eventoBom)).isTrue();
                assertThat(inboxProcessada(eventoRuim)).isFalse();
                processarIntencao(UUID.fromString(pedido.get("id").asText()));
                assertThat(p.contar("recebimento")).isEqualTo(1);
                assertBackoff(eventoRuim, 1, 30);
                inbox.encaminhar(); // Evento adiado não consome tentativa a cada ciclo.
                assertBackoff(eventoRuim, 1, 30);
                p.c.executar("update public.mp_inbox set tentativas=40,proximo_em=now() where id='" + eventoRuim + "'");
                inbox.encaminhar();
                assertBackoff(eventoRuim, 41, 900);
                assertThat(outro.contar("recebimento")).isZero();
            } finally {
                outro.executar("alter table " + outro.schema + ".checkout_indisponivel rename to pagamento_checkout");
                outro.executar("delete from public.mp_inbox where id='" + eventoRuim + "'");
                outro.executar("delete from public.mp_recurso where empresa_id='" + outro.empresa + "'");
            }
        }
    }

    @Test
    void inboxPreservaEventoAntesDoMapeamentoEDuranteLease() throws Exception {
        var pedido = enviar();
        UUID id = UUID.fromString(pedido.get("id").asText());
        processar();
        String recurso = externo(pedido);
        p.c.executar("delete from public.mp_recurso where empresa_id='" + p.c.empresa + "'");
        UUID evento = registrarInbox(recurso);
        inbox.encaminhar();
        assertThat(inboxProcessada(evento)).isFalse();
        assertBackoff(evento, 1, 30);
        p.c.executar("insert into public.mp_recurso(recurso,empresa_id) values ('" + recurso.toLowerCase(Locale.ROOT) + "','" + p.c.empresa + "')");
        antecipar();
        CheckoutRegistro trabalho;
        try (var scope = TenantScope.open(p.c.schema)) {
            trabalho = checkout.reivindicar();
        }
        p.c.executar("update public.mp_inbox set proximo_em=now() where id='" + evento + "'");
        inbox.encaminhar();
        assertThat(inboxProcessada(evento)).isFalse();
        assertBackoff(evento, 2, 60);
        try (var scope = TenantScope.open(p.c.schema)) {
            checkout.processar(trabalho);
        }
        p.c.executar("update public.mp_inbox set proximo_em=now() where id='" + evento + "'");
        inbox.encaminhar();
        assertThat(inboxProcessada(evento)).isTrue();
        processarIntencao(id);
        assertThat(p.contar("recebimento")).isZero();
    }

    private String recusar(JsonNode pedido) throws Exception {
        processar();
        String externo = externo(pedido);
        PROVEDOR.orders.get(externo).put("status", "failed");
        processarIntencao(UUID.fromString(pedido.get("id").asText()));
        assertThat(p.contar("pagamento_checkout where estado='RECUSADO'")).isEqualTo(1);
        return externo;
    }

    private UUID novaTentativa(JsonNode pedido) throws Exception {
        UUID id = UUID.randomUUID();
        var resposta = p.c.enviar("POST", rotaTentativa(pedido, id), p.tokenCliente, null);
        assertThat(resposta.getStatus()).as(resposta.getContentAsString()).isEqualTo(200);
        return id;
    }

    private String rotaTentativa(JsonNode pedido, UUID id) {
        return "/api/v1/me/pedidos/" + pedido.get("id").asText() + "/pagamento/tentativas/" + id;
    }

    private void processarIntencao(UUID id) throws Exception {
        p.c.executar("update " + p.c.schema + ".pagamento_checkout set proximo_em=now()+interval '1 hour'");
        p.c.executar("update " + p.c.schema + ".pagamento_checkout set proximo_em=now() where id='" + id + "'");
        try (var scope = TenantScope.open(p.c.schema)) {
            var trabalho = checkout.reivindicar();
            assertThat(trabalho).isNotNull();
            assertThat(trabalho.id()).isEqualTo(id);
            checkout.processar(trabalho);
        }
    }

    private UUID registrarInbox(String recurso) throws Exception {
        UUID id = UUID.randomUUID();
        try (var c = p.banco(); var s = c.prepareStatement("insert into public.mp_inbox(id,recurso) values (?,?)")) {
            s.setObject(1, id);
            s.setString(2, recurso.toLowerCase(Locale.ROOT));
            s.executeUpdate();
        }
        eventosCriados.add(id);
        return id;
    }

    private boolean inboxProcessada(UUID id) throws Exception {
        try (var c = p.banco(); var s = c.prepareStatement("select processado_em is not null from public.mp_inbox where id=?")) {
            s.setObject(1, id);
            try (var r = s.executeQuery()) {
                assertThat(r.next()).isTrue();
                return r.getBoolean(1);
            }
        }
    }

    private void assertBackoff(UUID id, int tentativas, int segundos) throws Exception {
        try (var c = p.banco(); var s = c.prepareStatement("select tentativas,extract(epoch from proximo_em-now()),ultima_falha from public.mp_inbox where id=?")) {
            s.setObject(1, id);
            try (var r = s.executeQuery()) {
                assertThat(r.next()).isTrue();
                assertThat(r.getInt(1)).isEqualTo(tentativas);
                assertThat(r.getDouble(2)).isBetween(segundos - 15.0, (double) segundos);
                assertThat(r.getString(3)).isNotBlank().doesNotContain(p.c.schema, "select", "update");
            }
        }
    }
}
