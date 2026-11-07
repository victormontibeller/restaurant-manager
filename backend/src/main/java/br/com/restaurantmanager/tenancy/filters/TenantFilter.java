package br.com.restaurantmanager.tenancy.filters;

import br.com.restaurantmanager.shared.dtos.ApiError;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.repositories.TenantRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Locale;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

@Component
public class TenantFilter extends OncePerRequestFilter {
    private final TenantRepository tenants;
    private final ObjectMapper mapper;

    public TenantFilter(TenantRepository tenants, ObjectMapper mapper) {
        this.tenants = tenants;
        this.mapper = mapper;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return !path.startsWith("/api/v1/") || path.equals("/api/v1/status")
                || path.startsWith("/api/v1/plataforma/") || path.startsWith("/api/v1/webhooks/");
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var schema = tenants.operationalSchemaForHost(request.getServerName().toLowerCase(Locale.ROOT));
        if (schema.isEmpty()) {
            response.setStatus(404);
            response.setContentType("application/json");
            mapper.writeValue(response.getOutputStream(), ApiError.of("EMPRESA_INDISPONIVEL", "Empresa indisponível."));
            return;
        }
        try (var scope = TenantScope.open(schema.get())) {
            chain.doFilter(request, response);
        }
    }
}
