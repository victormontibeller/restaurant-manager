package br.com.restaurantmanager.pagamentos.infrastructure;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;

import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.net.MPHttpClient;
import com.mercadopago.net.MPRequest;
import com.mercadopago.net.MPResponse;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.HashMap;
import java.util.Locale;
import java.util.stream.Collectors;

/** Mantém a serialização do SDK e torna explícitos os headers e retries efetivos. */
public class TransporteMercadoPago implements MPHttpClient {
    private final String testBase;
    private final HttpClient http =
            HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(5))
                    .followRedirects(HttpClient.Redirect.NEVER)
                    .build();

    public TransporteMercadoPago(String testBase) {
        this.testBase = testBase;
    }

    @Override
    public MPResponse send(MPRequest request) throws MPException, MPApiException {
        var headers = new HashMap<String, String>();
        request.getHeaders().forEach((k, v) -> headers.put(k.toLowerCase(Locale.ROOT), v));
        // O SDK 3.7.0 pode acrescentar um header default com caixa diferente.
        String chave = request.getHeaders().get("x-idempotency-key");
        if (chave != null) headers.put("x-idempotency-key", chave);
        // search passa por um overload do SDK que perde accessToken, mas mantém
        // o Authorization construído das opções desta chamada. Nunca usa token global.
        String authorization = headers.get("authorization");
        if (authorization == null
                || !authorization.startsWith("Bearer ")
                || authorization.equals("Bearer null")) {
            if (request.getAccessToken() == null || request.getAccessToken().isBlank())
                throw new IllegalStateException("Credencial por requisição ausente.");
            authorization = "Bearer " + request.getAccessToken();
        }
        headers.put("authorization", authorization);
        String token = authorization.substring(7);
        MPRequest normalizado =
                MPRequest.builder()
                        .uri(request.getUri())
                        .method(request.getMethod())
                        .headers(headers)
                        .payload(request.getPayload())
                        .queryParams(request.getQueryParams())
                        .accessToken(token)
                        .connectionTimeout(request.getConnectionTimeout())
                        .connectionRequestTimeout(request.getConnectionRequestTimeout())
                        .socketTimeout(request.getSocketTimeout())
                        .build();
        try {
            URI uri = URI.create(normalizado.getUri());
            if (!uri.getPath().startsWith("/v1/orders"))
                throw new IllegalStateException("Recurso financeiro inválido.");
            // Os caminhos create/get e search do SDK usam representações diferentes.
            String query = uri.getRawQuery();
            if (query == null && normalizado.getQueryParams() != null)
                query =
                        normalizado.getQueryParams().entrySet().stream()
                                .map(
                                        e ->
                                                URLEncoder.encode(
                                                                e.getKey(), StandardCharsets.UTF_8)
                                                        + "="
                                                        + URLEncoder.encode(
                                                                String.valueOf(e.getValue()),
                                                                StandardCharsets.UTF_8))
                                .collect(Collectors.joining("&"));
            String destino =
                    (testBase.isBlank() ? "https://api.mercadopago.com" : testBase)
                            + uri.getRawPath()
                            + (query == null || query.isEmpty() ? "" : "?" + query);
            var builder =
                    HttpRequest.newBuilder(URI.create(destino)).timeout(Duration.ofSeconds(10));
            headers.forEach(builder::header);
            var body =
                    normalizado.getPayload() == null
                            ? HttpRequest.BodyPublishers.noBody()
                            : HttpRequest.BodyPublishers.ofString(
                                    normalizado.getPayload().toString());
            var response =
                    http.send(
                            builder.method(normalizado.getMethod().name(), body).build(),
                            HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300)
                throw new AuthFailure(
                        503,
                        "PROVEDOR_INDISPONIVEL",
                        "A operação exige reconciliação com o provedor.");
            return new MPResponse(response.statusCode(), response.headers().map(), response.body());
        } catch (IOException erro) {
            throw new IllegalStateException("Provedor indisponível.");
        } catch (InterruptedException erro) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Operação financeira interrompida.");
        }
    }
}
