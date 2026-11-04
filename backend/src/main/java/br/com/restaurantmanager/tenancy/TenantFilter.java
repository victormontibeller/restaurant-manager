package br.com.restaurantmanager.tenancy;

import br.com.restaurantmanager.shared.ApiError;
import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class TenantFilter extends OncePerRequestFilter {
    private final TenantRepository tenants;
    private final ObjectMapper mapper;
    public TenantFilter(TenantRepository tenants, ObjectMapper mapper) { this.tenants = tenants; this.mapper = mapper; }
    @Override protected boolean shouldNotFilter(HttpServletRequest request) {
        return !request.getRequestURI().equals("/api/v1/unidades");
    }
    @Override protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var schema = tenants.activeSchemaForHost(request.getServerName().toLowerCase(Locale.ROOT));
        if (schema.isEmpty()) {
            response.setStatus(404);
            response.setContentType("application/json");
            mapper.writeValue(response.getOutputStream(), ApiError.of("EMPRESA_INDISPONIVEL", "Empresa indisponível."));
            return;
        }
        try (var scope = TenantScope.open(schema.get())) { chain.doFilter(request, response); }
    }
}
