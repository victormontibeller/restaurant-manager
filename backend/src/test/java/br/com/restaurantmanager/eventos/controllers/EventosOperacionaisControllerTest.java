package br.com.restaurantmanager.eventos.controllers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.restaurantmanager.shared.exceptions.ApiExceptionHandler;
import java.util.List;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class EventosOperacionaisControllerTest {
    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/eventos/stream", "/api/v1/mesa/eventos/stream"})
    void tokenQueVenceDepoisDoFiltroRetornaNaoAutenticadoAntesDeAbrirFluxo(String rota) throws Exception {
        JwtDecoder decoder = token -> {
            throw new JwtValidationException("Token expirado no intervalo entre filtro e controller.",
                    List.of(new OAuth2Error("invalid_token")));
        };

        mvc(decoder).perform(get(rota).param("unidadeId", "11111111-1111-1111-1111-111111111111")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer token-controlado")
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.codigo").value("CREDENCIAL_INVALIDA"))
                .andExpect(request().asyncNotStarted());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/eventos/stream", "/api/v1/mesa/eventos/stream"})
    void falhaInternaDoDecoderNaoEhConfundidaComTokenExpirado(String rota) throws Exception {
        JwtDecoder decoder = token -> { throw new IllegalStateException("Falha controlada do decoder."); };

        mvc(decoder).perform(get(rota).param("unidadeId", "11111111-1111-1111-1111-111111111111")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer token-controlado")
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.codigo").value("FALHA_INTERNA"))
                .andExpect(request().asyncNotStarted());
    }

    private MockMvc mvc(JwtDecoder decoder) {
        // A falha antecede consulta/autorização transacional e criação do SseEmitter.
        return MockMvcBuilders.standaloneSetup(new EventosOperacionaisController(null, null, decoder, decoder))
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new ApiExceptionHandler()).build();
    }
}
