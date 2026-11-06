package br.com.restaurantmanager.plataforma;

import br.com.restaurantmanager.shared.ApiError;
import br.com.restaurantmanager.tenancy.TenantScope;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

@Component
public class PlataformaFilter extends OncePerRequestFilter {
    private final String host;
    private final ObjectMapper mapper;
    private final JdbcTemplate jdbc;
    public PlataformaFilter(@Value("${rm.platform.host:plataforma.localhost}") String host,ObjectMapper mapper,JdbcTemplate jdbc) {
        if(!host.matches("[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?"))throw new IllegalStateException("Domínio SaaS inválido.");
        this.host=host;this.mapper=mapper;this.jdbc=jdbc;
    }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        // Host é origem configurada, nunca um seletor de schema ou um header de proxy livre.
        if(!host.equalsIgnoreCase(request.getServerName()) || !TenantScope.current().equals("__none__")
                || Boolean.TRUE.equals(jdbc.queryForObject("select exists(select 1 from public.dominio where host=?)",Boolean.class,host))) {
            response.setStatus(404);response.setContentType("application/json");mapper.writeValue(response.getOutputStream(),ApiError.of("PLATAFORMA_INDISPONIVEL","Plataforma indisponível."));return;
        }
        chain.doFilter(request,response);
    }
}
