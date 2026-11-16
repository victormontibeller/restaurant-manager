package br.com.restaurantmanager.shared.security;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.Locale;
import java.util.Set;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.InvalidMediaTypeException;
import org.springframework.http.MediaType;
import org.springframework.web.util.UriUtils;

public final class PaginaPublicaNaoEncontrada {
    private static final ClassPathResource PAGINA = new ClassPathResource("paginas/nao-encontrada.html");
    private static final Set<String> PREFIXOS_RESERVADOS =
            Set.of("api", "actuator", "assets", "icons", "error", "gestao", "cozinha", "plataforma", "design-system");

    private PaginaPublicaNaoEncontrada() {}

    public static boolean responder(HttpServletRequest pedido, HttpServletResponse resposta) throws IOException {
        if (!"GET".equals(pedido.getMethod())
                || pedido.getDispatcherType() != DispatcherType.REQUEST
                || pedido.getHeader(HttpHeaders.AUTHORIZATION) != null
                || !caminhoPublicoSemExtensao(pedido)
                || !aceitaHtml(pedido)) {
            return false;
        }
        try (var pagina = PAGINA.getInputStream()) {
            resposta.setStatus(HttpServletResponse.SC_NOT_FOUND);
            resposta.setContentType(MediaType.TEXT_HTML_VALUE);
            resposta.setCharacterEncoding(StandardCharsets.UTF_8.name());
            resposta.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
            resposta.addHeader(HttpHeaders.VARY, HttpHeaders.ACCEPT);
            pagina.transferTo(resposta.getOutputStream());
        }
        return true;
    }

    private static boolean caminhoPublicoSemExtensao(HttpServletRequest pedido) {
        String caminho;
        try {
            caminho = UriUtils.decode(pedido.getRequestURI().substring(pedido.getContextPath().length()),
                    StandardCharsets.UTF_8);
        } catch (IllegalArgumentException ignored) {
            return false;
        }
        if (caminho.length() <= 1 || !caminho.startsWith("/") || caminho.contains(".")) {
            return false;
        }
        String primeiroSegmento = caminho.substring(1).split("/", 2)[0].toLowerCase(Locale.ROOT);
        return !PREFIXOS_RESERVADOS.contains(primeiroSegmento);
    }

    private static boolean aceitaHtml(HttpServletRequest pedido) {
        try {
            return MediaType.parseMediaTypes(Collections.list(pedido.getHeaders(HttpHeaders.ACCEPT)))
                    .stream()
                    .anyMatch(tipo -> MediaType.TEXT_HTML.equalsTypeAndSubtype(tipo)
                            && tipo.getQualityValue() > 0);
        } catch (InvalidMediaTypeException ignored) {
            return false;
        }
    }
}
