package br.com.restaurantmanager.shared;

import tools.jackson.databind.ObjectMapper;
import br.com.restaurantmanager.identidade.AuthFailure;
import br.com.restaurantmanager.identidade.IdentidadeService;
import br.com.restaurantmanager.tenancy.TenantFilter;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.core.annotation.Order;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;

@Configuration
public class SecurityConfiguration {
    @Bean
    FilterRegistrationBean<TenantFilter> tenantRegistration(TenantFilter filter) {
        var registration = new FilterRegistrationBean<>(filter); registration.setEnabled(false); return registration;
    }
    @Bean @Order(1)
    SecurityFilterChain cookieEndpoints(HttpSecurity http, ObjectMapper mapper, TenantFilter tenants) throws Exception {
        var csrf = new CookieCsrfTokenRepository();
        csrf.setCookieName("__Host-RM_CSRF");
        csrf.setCookieCustomizer(c -> c.secure(true).httpOnly(true).path("/").sameSite("Strict"));
        return common(http, mapper, tenants)
                .securityMatcher("/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/auth/csrf", "/api/v1/auth/recuperacao", "/api/v1/auth/recuperacao/confirmar", "/api/v1/auth/cadastro", "/api/v1/auth/cadastro/confirmar", "/api/v1/auth/convites/aceitar", "/api/v1/auth/verificacao", "/api/v1/auth/verificacao/confirmar")
                .csrf(c -> c.csrfTokenRepository(csrf))
                .authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.GET, "/api/v1/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/login", "/api/v1/auth/refresh", "/api/v1/auth/logout", "/api/v1/auth/recuperacao", "/api/v1/auth/recuperacao/confirmar", "/api/v1/auth/cadastro", "/api/v1/auth/cadastro/confirmar", "/api/v1/auth/convites/aceitar", "/api/v1/auth/verificacao", "/api/v1/auth/verificacao/confirmar").permitAll().anyRequest().denyAll())
                .build();
    }
    @Bean @Order(2)
    SecurityFilterChain security(HttpSecurity http, ObjectMapper mapper, TenantFilter tenants, IdentidadeService identities) throws Exception {
        return common(http, mapper, tenants)
                .csrf(c -> c.ignoringRequestMatchers("/api/v1/carrinho/calcular"))
                .authorizeHttpRequests(a -> a.requestMatchers(HttpMethod.GET, "/", "/index.html", "/*.js", "/*.css", "/favicon.ico", "/manifest.webmanifest", "/icons/*.png", "/api/v1/status", "/api/v1/unidades", "/api/v1/unidades/*/funcionamento", "/actuator/health").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/catalogo", "/api/v1/catalogo/*", "/api/v1/midias/*").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/carrinho/calcular").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/gestao/catalogo/categorias", "/api/v1/gestao/catalogo/produtos", "/api/v1/gestao/catalogo/produtos/*", "/api/v1/gestao/catalogo/produtos/*/unidades/*", "/api/v1/operacao/catalogo", "/api/v1/gestao/midias/*", "/api/v1/clientes/me/favoritos").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/gestao/catalogo/categorias", "/api/v1/gestao/catalogo/produtos", "/api/v1/gestao/midias/*").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/gestao/catalogo/categorias/*", "/api/v1/gestao/catalogo/produtos/*", "/api/v1/gestao/catalogo/produtos/*/unidades/*", "/api/v1/clientes/me/favoritos/*").authenticated()
                        .requestMatchers(HttpMethod.DELETE, "/api/v1/clientes/me/favoritos/*").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/auth/me", "/api/v1/configuracoes/acessos", "/api/v1/equipe", "/api/v1/acessos/efetivos", "/api/v1/operacao/unidades", "/api/v1/operacao/unidades/*", "/api/v1/operacao/unidades/*/eventos").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/configuracoes/acessos", "/api/v1/equipe/*").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/configuracoes/unidades", "/api/v1/configuracoes/unidades/*", "/api/v1/configuracoes/unidades/*/funcionamento", "/api/v1/equipe/convites", "/api/v1/equipe/convites/*").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/configuracoes/unidades/*", "/api/v1/configuracoes/unidades/*/funcionamento").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/auth/reautenticar", "/api/v1/configuracoes/unidades", "/api/v1/equipe/convites", "/api/v1/equipe/convites/*/revogar").authenticated().anyRequest().denyAll())
                .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(jwt -> {
                    try {
                        if (br.com.restaurantmanager.tenancy.TenantScope.current().equals("__none__")) throw AuthFailure.invalid();
                        return new UsernamePasswordAuthenticationToken(identities.validar(jwt), null, java.util.List.of());
                    }
                    catch (AuthFailure error) { throw new OAuth2AuthenticationException(new OAuth2Error("invalid_token"), "Sessão inválida."); }
                })).authenticationEntryPoint((request, response, exception) -> {
                    response.setStatus(401); response.setContentType("application/json");
                    mapper.writeValue(response.getOutputStream(), ApiError.of("AUTENTICACAO_NECESSARIA", "Autenticação necessária."));
                }))
                .build();
    }
    private HttpSecurity common(HttpSecurity http, ObjectMapper mapper, TenantFilter tenants) throws Exception {
        return http.sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(tenants, SecurityContextHolderFilter.class)
                .exceptionHandling(e -> e.authenticationEntryPoint((request, response, exception) -> {
                    response.setStatus(401);
                    response.setContentType("application/json");
                    mapper.writeValue(response.getOutputStream(), ApiError.of("AUTENTICACAO_NECESSARIA", "Autenticação necessária."));
                }).accessDeniedHandler((request, response, exception) -> {
                    response.setStatus(403);
                    response.setContentType("application/json");
                    mapper.writeValue(response.getOutputStream(), ApiError.of("ACESSO_NEGADO", "Acesso negado."));
                }))
                .headers(h -> h.contentSecurityPolicy(c -> c.policyDirectives("default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'self'")));
    }
}
