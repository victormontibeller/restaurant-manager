package br.com.restaurantmanager.shared.security;

import jakarta.servlet.DispatcherType;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.web.util.matcher.RequestMatcher;

/** A página interna de erro encerra o transporte; não reabre o stream autorizado. */
public final class DespachoErroSseMatcher implements RequestMatcher {
    @Override
    public boolean matches(HttpServletRequest request) {
        DispatcherType tipo = request.getDispatcherType();
        if (!"GET".equals(request.getMethod())
                || (tipo != DispatcherType.ERROR && tipo != DispatcherType.INCLUDE)
                || !(request.getAttribute(RequestDispatcher.ERROR_EXCEPTION) instanceof Throwable)) {
            return false;
        }
        String contexto = request.getContextPath();
        Object origem = request.getAttribute(RequestDispatcher.ERROR_REQUEST_URI);
        if (!(contexto + "/api/v1/eventos/stream").equals(origem)
                && !(contexto + "/api/v1/mesa/eventos/stream").equals(origem)) {
            return false;
        }
        String destino = contexto + "/error";
        String atual = request.getRequestURI();
        if (!atual.equals(origem) && !atual.equals(destino)) {
            return false;
        }
        // Tomcat inclui a página ao encontrar uma resposta já enviada e conserva a URI original.
        Object incluido = request.getAttribute(RequestDispatcher.INCLUDE_REQUEST_URI);
        return tipo == DispatcherType.INCLUDE ? destino.equals(incluido)
                : destino.equals(atual) || destino.equals(incluido);
    }
}
