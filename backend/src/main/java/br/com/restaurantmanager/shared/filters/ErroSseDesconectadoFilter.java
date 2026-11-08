package br.com.restaurantmanager.shared.filters;

import br.com.restaurantmanager.shared.security.DespachoErroSseMatcher;
import jakarta.servlet.FilterChain;
import jakarta.servlet.RequestDispatcher;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.GenericFilterBean;
import org.springframework.web.util.DisconnectedClientHelper;

/** Não tenta renderizar uma página de erro dentro de um stream já encerrado pelo cliente. */
public final class ErroSseDesconectadoFilter extends GenericFilterBean {
    private final DespachoErroSseMatcher despachoInterno = new DespachoErroSseMatcher();

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request instanceof HttpServletRequest http && response instanceof HttpServletResponse resposta
                && resposta.isCommitted() && despachoInterno.matches(http)
                && DisconnectedClientHelper.isClientDisconnectedException(
                        (Throwable) http.getAttribute(RequestDispatcher.ERROR_EXCEPTION))) {
            return;
        }
        chain.doFilter(request, response);
    }
}
