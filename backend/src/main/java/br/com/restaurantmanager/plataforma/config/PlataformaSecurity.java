package br.com.restaurantmanager.plataforma.config;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.plataforma.filters.PlataformaFilter;
import br.com.restaurantmanager.plataforma.services.PlataformaService;
import br.com.restaurantmanager.shared.dtos.ApiError;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
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
public class PlataformaSecurity {
    @Bean
    FilterRegistrationBean<PlataformaFilter> platformRegistration(PlataformaFilter filter) {
        var registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    @Bean
    @Order(-2)
    SecurityFilterChain platformCookies(HttpSecurity http, ObjectMapper mapper, PlataformaFilter filter)
            throws Exception {
        var csrf = new CookieCsrfTokenRepository();
        csrf.setCookieName("__Host-RM_PLATFORM_CSRF");
        csrf.setCookieCustomizer(cookie -> cookie.secure(true).httpOnly(true).path("/").sameSite("Strict"));
        return common(http, mapper, filter)
                .securityMatcher("/api/v1/plataforma/auth/csrf", "/api/v1/plataforma/auth/login",
                        "/api/v1/plataforma/auth/refresh", "/api/v1/plataforma/auth/logout")
                .csrf(config -> config.csrfTokenRepository(csrf))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/v1/plataforma/auth/csrf").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/plataforma/auth/login",
                                "/api/v1/plataforma/auth/refresh", "/api/v1/plataforma/auth/logout").permitAll()
                        .anyRequest().denyAll())
                .build();
    }

    @Bean
    @Order(-1)
    SecurityFilterChain platformBearer(
            HttpSecurity http, ObjectMapper mapper, PlataformaFilter filter, PlataformaService service,
            @Qualifier("platformJwtDecoder") JwtDecoder decoder) throws Exception {
        return common(http, mapper, filter)
                .securityMatcher("/api/v1/plataforma/**")
                .csrf(config -> config.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.GET, "/api/v1/plataforma/auth/me",
                                "/api/v1/plataforma/empresas", "/api/v1/plataforma/empresas/*").authenticated()
                        .requestMatchers(HttpMethod.GET, "/api/v1/plataforma/provisionamentos",
                                "/api/v1/plataforma/provisionamentos/*").authenticated()
                        .requestMatchers(HttpMethod.POST, "/api/v1/plataforma/auth/reautenticar",
                                "/api/v1/plataforma/provisionamentos",
                                "/api/v1/plataforma/provisionamentos/*/retomar").authenticated()
                        .requestMatchers(HttpMethod.PUT, "/api/v1/plataforma/empresas/*/estado").authenticated()
                        .anyRequest().denyAll())
                .oauth2ResourceServer(oauth -> oauth
                        .jwt(config -> config.decoder(decoder).jwtAuthenticationConverter(jwt -> {
                            try {
                                return new UsernamePasswordAuthenticationToken(service.validar(jwt), null, List.of());
                            } catch (AuthFailure failure) {
                                throw new OAuth2AuthenticationException(
                                        new OAuth2Error("invalid_token"), "Sessão inválida.");
                            }
                        }))
                        .authenticationEntryPoint((request, response, error) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            mapper.writeValue(response.getOutputStream(),
                                    ApiError.of("AUTENTICACAO_NECESSARIA", "Autenticação necessária."));
                        }))
                .build();
    }

    private HttpSecurity common(HttpSecurity http, ObjectMapper mapper, PlataformaFilter filter) throws Exception {
        return http
                .sessionManagement(config -> config.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(filter, SecurityContextHolderFilter.class)
                .exceptionHandling(config -> config
                        .authenticationEntryPoint((request, response, error) -> {
                            response.setStatus(401);
                            response.setContentType("application/json");
                            mapper.writeValue(response.getOutputStream(),
                                    ApiError.of("AUTENTICACAO_NECESSARIA", "Autenticação necessária."));
                        })
                        .accessDeniedHandler((request, response, error) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            mapper.writeValue(response.getOutputStream(), ApiError.of("ACESSO_NEGADO", "Acesso negado."));
                        }));
    }
}
