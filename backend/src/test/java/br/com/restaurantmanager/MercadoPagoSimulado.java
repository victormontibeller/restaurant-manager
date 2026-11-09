package br.com.restaurantmanager;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

/** Provedor HTTP controlado: exerce serialização e transporte reais do SDK, sem sandbox. */
final class MercadoPagoSimulado implements AutoCloseable {
    final Map<String, String> vendedores = new ConcurrentHashMap<>();
    final Map<String, Map<String, Object>> orders = new ConcurrentHashMap<>();
    final Map<String, String> criacoes = new ConcurrentHashMap<>();
    final Map<String, String> devolucoes = new ConcurrentHashMap<>();
    final Map<String, Map<String, String>> codigos = new ConcurrentHashMap<>();
    final Map<String, String> renovacoes = new ConcurrentHashMap<>();
    final AtomicInteger refreshes = new AtomicInteger();
    final AtomicBoolean perderCriacao = new AtomicBoolean();
    final AtomicBoolean perderDevolucao = new AtomicBoolean();
    final ObjectMapper mapper = new ObjectMapper();
    private final HttpServer server;
    private final ExecutorService executor = Executors.newCachedThreadPool();

    MercadoPagoSimulado() throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.setExecutor(executor);
        server.createContext("/", this::atender);
        server.start();
    }

    String url() {
        return "http://127.0.0.1:" + server.getAddress().getPort();
    }

    synchronized void aprovar(String id) {
        var order = orders.get(id);
        order.put("status", "processed");
        order.put("total_paid_amount", order.get("total_amount"));
        order.put(
                "transactions",
                Map.of(
                        "payments",
                        List.of(
                                Map.of(
                                        "id",
                                        "PAY" + id,
                                        "amount",
                                        order.get("total_amount"),
                                        "paid_amount",
                                        order.get("total_amount"),
                                        "status",
                                        "processed")),
                        "refunds",
                        new ArrayList<>()));
    }

    private synchronized void atender(HttpExchange x) throws IOException {
        try {
            String path = x.getRequestURI().getPath();
            if (path.equals("/oauth/token")) {
                var body = mapper.readTree(x.getRequestBody().readAllBytes());
                String vendedor;
                if (body.path("grant_type").asText().equals("authorization_code")) {
                    var codigo = codigos.remove(body.path("code").asText());
                    String desafio =
                            Base64.getUrlEncoder()
                                    .withoutPadding()
                                    .encodeToString(
                                            MessageDigest.getInstance("SHA-256")
                                                    .digest(
                                                            body.path("code_verifier")
                                                                    .asText()
                                                                    .getBytes(
                                                                            StandardCharsets
                                                                                    .US_ASCII)));
                    if (codigo == null
                            || !desafio.equals(codigo.get("desafio"))
                            || !body.path("redirect_uri").asText().equals(codigo.get("retorno"))) {
                        responder(x, 400, Map.of("error", "invalid_grant"));
                        return;
                    }
                    vendedor = codigo.get("vendedor");
                } else {
                    vendedor = renovacoes.remove(body.path("refresh_token").asText());
                    refreshes.incrementAndGet();
                    if (vendedor == null) {
                        responder(x, 400, Map.of("error", "invalid_grant"));
                        return;
                    }
                }
                String access = UUID.randomUUID().toString(),
                        refresh = UUID.randomUUID().toString();
                vendedores.put(access, vendedor);
                renovacoes.put(refresh, vendedor);
                responder(
                        x,
                        200,
                        Map.of(
                                "access_token",
                                access,
                                "refresh_token",
                                refresh,
                                "user_id",
                                vendedor,
                                "expires_in",
                                3600));
                return;
            }
            String token = x.getRequestHeaders().getFirst("Authorization");
            String vendedor = token == null ? null : vendedores.get(token.replace("Bearer ", ""));
            if (vendedor == null) {
                responder(x, 401, Map.of("message", "Credencial fictícia inválida"));
                return;
            }
            if (path.equals("/v1/orders") && x.getRequestMethod().equals("GET")) {
                String referencia =
                        parametros(x.getRequestURI().getRawQuery()).get("external_reference");
                responder(
                        x,
                        200,
                        Map.of(
                                "data",
                                orders.values().stream()
                                        .filter(
                                                o ->
                                                        vendedor.equals(o.get("user_id"))
                                                                && referencia.equals(
                                                                        o.get(
                                                                                "external_reference")))
                                        .toList()));
            } else if (path.equals("/v1/orders")) {
                JsonNode body = mapper.readTree(x.getRequestBody().readAllBytes());
                String chave = x.getRequestHeaders().getFirst("X-Idempotency-Key");
                String id =
                        criacoes.computeIfAbsent(
                                vendedor + ":" + chave,
                                k -> "ORDTST" + UUID.randomUUID().toString().replace("-", ""));
                if (!orders.containsKey(id)) {
                    var order = new HashMap<String, Object>();
                    order.put("id", id);
                    order.put("user_id", vendedor);
                    order.put("currency", "BRL");
                    order.put("external_reference", body.get("external_reference").asText());
                    order.put("total_amount", body.get("total_amount").asText());
                    order.put("status", "created");
                    order.put("checkout_url", url() + "/checkout/" + id);
                    order.put("transactions", Map.of("payments", List.of(), "refunds", List.of()));
                    orders.put(id, order);
                }
                if (perderCriacao.compareAndSet(true, false)) {
                    x.close();
                    return;
                }
                responder(x, 201, orders.get(id));
            } else {
                String id = path.split("/")[3];
                var order = orders.get(id);
                if (order == null || !vendedor.equals(order.get("user_id"))) {
                    responder(x, 404, Map.of("message", "Order fictícia indisponível"));
                    return;
                }
                if (path.endsWith("/cancel")) order.put("status", "canceled");
                if (path.endsWith("/refund")) {
                    JsonNode body = mapper.readTree(x.getRequestBody().readAllBytes());
                    String chave = x.getRequestHeaders().getFirst("X-Idempotency-Key");
                    if (!devolucoes.containsKey(chave)) {
                        String refund = "REF" + UUID.randomUUID().toString().replace("-", "");
                        devolucoes.put(chave, refund);
                        var transacoes = mapper.valueToTree(order.get("transactions"));
                        var refunds = new ArrayList<Object>();
                        transacoes
                                .path("refunds")
                                .forEach(r -> refunds.add(mapper.convertValue(r, Object.class)));
                        refunds.add(
                                Map.of(
                                        "id",
                                        refund,
                                        "transaction_id",
                                        body.get("transactions").get(0).get("id").asText(),
                                        "amount",
                                        body.get("transactions").get(0).get("amount").asText(),
                                        "status",
                                        "processed"));
                        order.put(
                                "transactions",
                                Map.of(
                                        "payments",
                                        mapper.convertValue(transacoes.get("payments"), List.class),
                                        "refunds",
                                        refunds));
                    }
                    if (perderDevolucao.compareAndSet(true, false)) {
                        x.close();
                        return;
                    }
                }
                responder(x, 200, order);
            }
        } catch (RuntimeException | NoSuchAlgorithmException erro) {
            responder(x, 500, Map.of("message", "Falha do provedor controlado"));
        } finally {
            x.close();
        }
    }

    private Map<String, String> parametros(String query) {
        var valores = new HashMap<String, String>();
        if (query != null)
            for (String p : query.split("&")) {
                String[] partes = p.split("=", 2);
                valores.put(
                        URLDecoder.decode(partes[0], StandardCharsets.UTF_8),
                        URLDecoder.decode(
                                partes.length == 2 ? partes[1] : "", StandardCharsets.UTF_8));
            }
        return valores;
    }

    private void responder(HttpExchange x, int status, Object body) throws IOException {
        byte[] json = mapper.writeValueAsBytes(body);
        x.getResponseHeaders().set("Content-Type", "application/json");
        x.sendResponseHeaders(status, json.length);
        x.getResponseBody().write(json);
    }

    @Override
    public void close() {
        server.stop(0);
        executor.shutdownNow();
    }
}
