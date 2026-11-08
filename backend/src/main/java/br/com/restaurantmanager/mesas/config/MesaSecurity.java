package br.com.restaurantmanager.mesas.config;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.mesas.services.MesaSessaoService;
import br.com.restaurantmanager.shared.dtos.ApiError;
import br.com.restaurantmanager.shared.filters.ErroSseDesconectadoFilter;
import br.com.restaurantmanager.shared.security.DespachoErroSseMatcher;
import br.com.restaurantmanager.tenancy.filters.TenantFilter;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import tools.jackson.databind.ObjectMapper;

@Configuration
public class MesaSecurity {
    @Bean
    @Order(-4)
    SecurityFilterChain mesaCookies(HttpSecurity http, ObjectMapper mapper, TenantFilter tenants) throws Exception {
        var csrf = new CookieCsrfTokenRepository();
        csrf.setCookieName("__Host-RM_MESA_CSRF");
        csrf.setCookieCustomizer(cookie -> cookie.secure(true).httpOnly(true).path("/").sameSite("Strict"));
        return comum(http, mapper, tenants)
                .securityMatcher("/api/v1/mesa/auth/**")
                .csrf(config -> config.csrfTokenRepository(csrf))
                .authorizeHttpRequests(auth -> auth.requestMatchers(HttpMethod.GET, "/api/v1/mesa/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/mesa/auth/autorizar", "/api/v1/mesa/auth/refresh", "/api/v1/mesa/auth/logout").permitAll()
                        .anyRequest().denyAll())
                .build();
    }

    @Bean
    @Order(-3)
    SecurityFilterChain mesaBearer(HttpSecurity http, ObjectMapper mapper, TenantFilter tenants, MesaSessaoService sessoes,
            @Qualifier("mesaJwtDecoder") JwtDecoder decoder) throws Exception {
        return comum(http, mapper, tenants)
                .securityMatcher("/api/v1/mesa/**")
                .csrf(config -> config.disable())
                .authorizeHttpRequests(auth -> auth.requestMatchers(new DespachoErroSseMatcher()).permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/api/v1/mesa/sessao", "/api/v1/mesa/comanda", "/api/v1/mesa/pedidos", "/api/v1/mesa/pedidos/*",
                                "/api/v1/mesa/pedidos/intencoes/*", "/api/v1/mesa/eventos", "/api/v1/mesa/eventos/stream").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/mesa/solicitacoes", "/api/v1/mesa/pedidos",
                                "/api/v1/mesa/pedidos/*/cancelar", "/api/v1/mesa/pedidos/*/solicitar-cancelamento").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth.jwt(config -> config.decoder(decoder).jwtAuthenticationConverter(jwt -> {
                    try {
                        return new UsernamePasswordAuthenticationToken(sessoes.validar(jwt), null, List.of());
                    } catch (AuthFailure erro) {
                        throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"), "Sessão inválida.");
                    }
                })).authenticationEntryPoint((request, response, error) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    mapper.writeValue(response.getOutputStream(), ApiError.of("AUTENTICACAO_NECESSARIA", "Autenticação necessária."));
                }))
                .build();
    }

    private HttpSecurity comum(HttpSecurity http, ObjectMapper mapper, TenantFilter tenants) throws Exception {
        return http.sessionManagement(config -> config.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(tenants, SecurityContextHolderFilter.class)
                .addFilterBefore(new ErroSseDesconectadoFilter(), TenantFilter.class)
                .exceptionHandling(config -> config.authenticationEntryPoint((request, response, error) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    mapper.writeValue(response.getOutputStream(), ApiError.of("AUTENTICACAO_NECESSARIA", "Autenticação necessária."));
                }).accessDeniedHandler((request, response, error) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    mapper.writeValue(response.getOutputStream(), ApiError.of("ACESSO_NEGADO", "Acesso negado."));
                }));
    }
}
