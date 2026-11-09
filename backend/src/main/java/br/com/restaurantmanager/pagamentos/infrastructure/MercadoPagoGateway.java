package br.com.restaurantmanager.pagamentos.infrastructure;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.pagamentos.dtos.CredencialPagamento;
import br.com.restaurantmanager.pagamentos.dtos.PagamentoProvedor;
import br.com.restaurantmanager.pagamentos.dtos.ReembolsoProvedor;
import br.com.restaurantmanager.pagamentos.dtos.SituacaoProvedor;

import com.mercadopago.client.order.OrderClient;
import com.mercadopago.client.order.OrderConfigRequest;
import com.mercadopago.client.order.OrderCreateRequest;
import com.mercadopago.client.order.OrderItemRequest;
import com.mercadopago.client.order.OrderOnlineConfig;
import com.mercadopago.client.order.OrderPaymentMethodConfig;
import com.mercadopago.client.order.OrderRefundPaymentRequest;
import com.mercadopago.client.order.OrderRefundRequest;
import com.mercadopago.core.MPRequestOptions;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.net.MPSearchRequest;
import com.mercadopago.resources.order.Order;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
public class MercadoPagoGateway implements GatewayPagamento {
    private final String clientId;
    private final String clientSecret;
    private final String testBase;
    private final ObjectMapper mapper;
    private final HttpClient http =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .followRedirects(HttpClient.Redirect.NEVER)
                    .build();
    private final OrderClient orders;

    public MercadoPagoGateway(
            ObjectMapper mapper,
            @Value("${rm.pagamentos.client-id:}") String clientId,
            @Value("${rm.pagamentos.client-secret:}") String clientSecret,
            @Value("${rm.pagamentos.test-base-url:}") String testBase,
            @Value("${rm.stage:dev}") String stage) {
        this.mapper = mapper;
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        if (!testBase.isBlank()
                && (!stage.equals("test")
                        || !testBase.matches("http://127\\.0\\.0\\.1:[0-9]{1,5}"))) {
            throw new IllegalStateException("Transporte financeiro de teste recusado.");
        }
        this.testBase = testBase;
        this.orders = new OrderClient(new TransporteMercadoPago(testBase));
    }

    @Override
    public String autorizacao(String state, String desafio, String retorno) {
        exigirConfiguracao();
        String base =
                testBase.isBlank()
                        ? "https://auth.mercadopago.com.br/authorization"
                        : testBase + "/authorization";
        return base
                + "?response_type=code&client_id="
                + encode(clientId)
                + "&redirect_uri="
                + encode(retorno)
                + "&state="
                + encode(state)
                + "&code_challenge="
                + encode(desafio)
                + "&code_challenge_method=S256&scope=read%20write%20offline_access";
    }

    @Override
    public CredencialPagamento autorizar(String code, String verificador, String retorno) {
        return oauth(
                Map.of(
                        "grant_type",
                        "authorization_code",
                        "code",
                        code,
                        "code_verifier",
                        verificador,
                        "redirect_uri",
                        retorno));
    }

    @Override
    public CredencialPagamento renovar(CredencialPagamento anterior) {
        return oauth(
                Map.of("grant_type", "refresh_token", "refresh_token", anterior.refreshToken()));
    }

    // O SDK 3.7.0 não transporta code_verifier. HTTP fica restrito a OAuth/PKCE.
    private CredencialPagamento oauth(Map<String, String> campos) {
        exigirConfiguracao();
        var dados = new HashMap<>(campos);
        dados.put("client_id", clientId);
        dados.put("client_secret", clientSecret);
        String corpo = mapper.writeValueAsString(dados);
        try {
            var request =
                    HttpRequest.newBuilder(
                                    URI.create(
                                            (testBase.isBlank()
                                                            ? "https://api.mercadopago.com"
                                                            : testBase)
                                                    + "/oauth/token"))
                            .timeout(Duration.ofSeconds(10))
                            .header("Content-Type", "application/json")
                            .POST(HttpRequest.BodyPublishers.ofString(corpo))
                            .build();
            var response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) throw indisponivel();
            var json = mapper.readTree(response.body());
            String access = json.path("access_token").asText();
            String refresh = json.path("refresh_token").asText();
            String vendedor = json.path("user_id").asText();
            long segundos = json.path("expires_in").asLong();
            if (access.isBlank() || refresh.isBlank() || vendedor.isBlank() || segundos <= 0)
                throw indisponivel();
            return new CredencialPagamento(
                    access, refresh, vendedor, Instant.now().plusSeconds(segundos));
        } catch (IOException erro) {
            throw indisponivel();
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw indisponivel();
        }
    }

    @Override
    public SituacaoProvedor criar(
            CredencialPagamento c, UUID intencao, String valor, int prazo, String retorno) {
        var request =
                OrderCreateRequest.builder()
                        .type("online")
                        .processingMode("manual")
                        .captureMode("automatic_async")
                        .externalReference(intencao.toString())
                        .totalAmount(valor)
                        .currency("BRL")
                        .expirationTime("PT" + prazo + "S")
                        .items(
                                List.of(
                                        OrderItemRequest.builder()
                                                .title("Pedido do restaurante")
                                                .quantity(1)
                                                .unitPrice(valor)
                                                .build()))
                        .config(
                                OrderConfigRequest.builder()
                                        .paymentMethod(
                                                OrderPaymentMethodConfig.builder()
                                                        .notAllowedTypes(
                                                                List.of(
                                                                        "ticket",
                                                                        "atm",
                                                                        "wallet",
                                                                        "account_money"))
                                                        .maxInstallments(1)
                                                        .build())
                                        .online(
                                                OrderOnlineConfig.builder()
                                                        .successUrl(retorno)
                                                        .failureUrl(retorno)
                                                        .pendingUrl(retorno)
                                                        .build())
                                        .build())
                        .build();
        try {
            return traduzir(orders.create(request, options(c, intencao)));
        } catch (MPException | MPApiException erro) {
            throw indisponivel();
        }
    }

    @Override
    public void cancelar(CredencialPagamento c, String id, UUID intencao) {
        try {
            orders.cancel(id, options(c, intencao));
        } catch (MPException | MPApiException erro) {
            throw indisponivel();
        }
    }

    @Override
    public SituacaoProvedor consultar(CredencialPagamento c, String id) {
        try {
            return traduzir(orders.get(id, options(c, null)));
        } catch (MPException | MPApiException erro) {
            throw indisponivel();
        }
    }

    @Override
    public List<SituacaoProvedor> buscar(CredencialPagamento c, UUID id, Instant inicio) {
        try {
            var result =
                    orders.search(
                            MPSearchRequest.builder()
                                    .limit(50)
                                    .offset(0)
                                    .filters(
                                            Map.of(
                                                    "external_reference",
                                                    id.toString(),
                                                    "begin_date",
                                                    inicio.minusSeconds(60).toString(),
                                                    "end_date",
                                                    Instant.now().plusSeconds(60).toString()))
                                    .build(),
                            options(c, null));
            return result.getData() == null
                    ? List.of()
                    : result.getData().stream().map(this::traduzir).toList();
        } catch (MPException | MPApiException erro) {
            throw indisponivel();
        }
    }

    @Override
    public SituacaoProvedor devolver(
            CredencialPagamento c, String id, String transacao, String valor, UUID intencao) {
        var request =
                OrderRefundRequest.builder()
                        .transactions(
                                List.of(
                                        OrderRefundPaymentRequest.builder()
                                                .id(transacao)
                                                .amount(valor)
                                                .build()))
                        .build();
        try {
            return traduzir(orders.refund(id, request, options(c, intencao)));
        } catch (MPException | MPApiException erro) {
            throw indisponivel();
        }
    }

    private MPRequestOptions options(CredencialPagamento credencial, UUID intencao) {
        return MPRequestOptions.builder()
                .accessToken(credencial.accessToken())
                .connectionTimeout(5000)
                .socketTimeout(10000)
                .connectionRequestTimeout(5000)
                .maxRetries(0)
                .customHeaders(
                        intencao == null
                                ? Map.of()
                                : Map.of("X-Idempotency-Key", intencao.toString()))
                .build();
    }

    private SituacaoProvedor traduzir(Order order) {
        var transacoes = order.getTransactions();
        var pagamentos =
                transacoes == null || transacoes.getPayments() == null
                        ? List.<PagamentoProvedor>of()
                        : transacoes.getPayments().stream()
                                .map(
                                        p ->
                                                new PagamentoProvedor(
                                                        p.getId(),
                                                        p.getPaidAmount() == null
                                                                ? p.getAmount()
                                                                : p.getPaidAmount(),
                                                        p.getStatus()))
                                .toList();
        var devolucoes =
                transacoes == null || transacoes.getRefunds() == null
                        ? List.<ReembolsoProvedor>of()
                        : transacoes.getRefunds().stream()
                                .map(
                                        r ->
                                                new ReembolsoProvedor(
                                                        r.getId(),
                                                        r.getTransactionId(),
                                                        r.getAmount(),
                                                        r.getStatus()))
                                .toList();
        return new SituacaoProvedor(
                order.getId(),
                order.getUserId(),
                order.getExternalReference(),
                order.getCurrency(),
                order.getTotalAmount(),
                order.getCheckoutUrl(),
                order.getStatus(),
                pagamentos,
                devolucoes);
    }

    private void exigirConfiguracao() {
        if (clientId.isBlank() || clientSecret.isBlank()) throw indisponivel();
    }

    private AuthFailure indisponivel() {
        return new AuthFailure(
                503,
                "PROVEDOR_INDISPONIVEL",
                "Pagamento não confirmado. A operação será reconciliada antes de outra tentativa.");
    }

    private static String encode(String texto) {
        return URLEncoder.encode(texto, StandardCharsets.UTF_8);
    }
}
