package br.com.restaurantmanager.shared.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.IdentidadeService;
import br.com.restaurantmanager.mesas.config.MesaSecurity;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.mesas.services.MesaSessaoService;
import br.com.restaurantmanager.shared.exceptions.ApiExceptionHandler;
import br.com.restaurantmanager.tenancy.filters.TenantFilter;
import br.com.restaurantmanager.tenancy.repositories.TenantRepository;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.Filter;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import jakarta.servlet.RequestDispatcher;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.webmvc.autoconfigure.error.BasicErrorController;
import org.springframework.boot.webmvc.error.DefaultErrorAttributes;
import org.springframework.boot.autoconfigure.web.ErrorProperties;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import tools.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;

class DespachoSseSecurityTest {
    private AnnotationConfigWebApplicationContext context;
    private MockMvc mvc;
    private FluxoControlado controller;

    @BeforeEach
    void configurarCadeiasReais() {
        context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        context.register(ConfigTeste.class);
        context.refresh();
        mvc = MockMvcBuilders.webAppContextSetup(context)
                .addFilter(context.getBean("springSecurityFilterChain", Filter.class)).build();
        controller = context.getBean(FluxoControlado.class);
    }

    @AfterEach
    void fechar() {
        context.close();
    }


    @ParameterizedTest
    @EnumSource(value = DispatcherType.class, names = {"ERROR", "INCLUDE"})
    void paginaDeErroInternaDoSseEncerradoPreservaRespostaConfirmada(DispatcherType tipo) throws Exception {
        var transporte = MockMvcBuilders.webAppContextSetup(context)
                .addFilter((request, response, chain) -> {
                    var http = (HttpServletResponse) response;
                    http.setContentType(MediaType.TEXT_EVENT_STREAM_VALUE);
                    http.getWriter().write(":conexao\n\n");
                    http.flushBuffer();
                    chain.doFilter(request, response);
                }).addFilter(context.getBean("springSecurityFilterChain", Filter.class)).build();
        for (String origem : new String[]{"/api/v1/eventos/stream", "/api/v1/mesa/eventos/stream"}) {
            transporte.perform(get(tipo == DispatcherType.INCLUDE ? origem : "/error")
                            .with(request -> { request.setDispatcherType(tipo); return request; })
                            .requestAttr(RequestDispatcher.INCLUDE_REQUEST_URI, "/error")
                            .requestAttr(RequestDispatcher.INCLUDE_SERVLET_PATH, "/error")
                            .requestAttr(RequestDispatcher.INCLUDE_CONTEXT_PATH, "")
                            .requestAttr(RequestDispatcher.ERROR_REQUEST_URI, origem)
                            .requestAttr(RequestDispatcher.ERROR_EXCEPTION, new IOException("Broken pipe"))
                            .requestAttr(RequestDispatcher.ERROR_STATUS_CODE, 500))
                    .andExpect(status().isOk()).andExpect(content().string(":conexao\n\n"))
                    .andExpect(result -> assertThat(result.getResolvedException()).isNull());
        }
        assertThat(controller.aberturas).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/eventos/stream", "/api/v1/mesa/eventos/stream"})
    void conclusaoAssincronaDoStreamAutorizadoPreservaRespostaConfirmada(String rota) throws Exception {
        var inicial = mvc.perform(get(rota).header("Authorization", "Bearer teste-local")
                        .accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(request().asyncStarted()).andReturn();
        controller.emitter.send(SseEmitter.event().comment("conexao"));
        assertThat(inicial.getResponse().isCommitted()).isTrue();
        String enviado = inicial.getResponse().getContentAsString();
        controller.emitter.complete();

        mvc.perform(asyncDispatch(inicial)).andExpect(status().isOk()).andExpect(content().string(enviado));
        assertThat(controller.aberturas).isEqualTo(1);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/eventos/stream", "/api/v1/mesa/eventos/stream"})
    void requisicaoInicialDoStreamContinuaExigindoBearer(String rota) throws Exception {
        mvc.perform(get(rota)).andExpect(status().isUnauthorized());
        assertThat(controller.aberturas).isZero();
    }

    @Test
    void despachoAssincronoForaDosDoisStreamsContinuaNegado() throws Exception {
        for (String rota : new String[]{"/api/v1/me/pedidos", "/api/v1/mesa/comanda", "/api/v1/desconhecida"}) {
            mvc.perform(get(rota).with(request -> { request.setDispatcherType(DispatcherType.ASYNC); return request; })).andExpect(status().is4xxClientError());
        }
    }

    @Test
    void metodoDiferenteDeGetNaoRecebeExcecaoDeDespacho() throws Exception {
        for (String rota : new String[]{"/api/v1/eventos/stream", "/api/v1/mesa/eventos/stream"}) {
            mvc.perform(post(rota).with(request -> { request.setDispatcherType(DispatcherType.ASYNC); return request; })).andExpect(status().is4xxClientError());
        }
    }

    @Test
    void rotaDesconhecidaPermaneceNegadaMesmoAutenticada() throws Exception {
        mvc.perform(get("/api/v1/desconhecida").header("Authorization", "Bearer teste-local"))
                .andExpect(status().isForbidden());
    }

    @Test
    void rotaErrorNaoFicaPublicaEmRequestNemEmError() throws Exception {
        mvc.perform(get("/error")).andExpect(status().isUnauthorized());
        mvc.perform(get("/error").with(request -> { request.setDispatcherType(DispatcherType.ERROR); return request; })
                        .requestAttr(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/eventos/stream"))
                .andExpect(status().isUnauthorized());
    }


    @Test
    void origemOuDestinoInesperadoNaoLiberaPaginaInterna() throws Exception {
        for (DispatcherType tipo : new DispatcherType[]{DispatcherType.ERROR, DispatcherType.INCLUDE}) {
            mvc.perform(get("/error")
                            .with(request -> { request.setDispatcherType(tipo); return request; })
                            .requestAttr(RequestDispatcher.INCLUDE_REQUEST_URI, "/error")
                            .requestAttr(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/me/pedidos")
                            .requestAttr(RequestDispatcher.ERROR_EXCEPTION, new IOException("Broken pipe")))
                    .andExpect(status().isUnauthorized());
            mvc.perform(get("/api/v1/desconhecida")
                            .with(request -> { request.setDispatcherType(tipo); return request; })
                            .requestAttr(RequestDispatcher.INCLUDE_REQUEST_URI, "/api/v1/desconhecida")
                            .requestAttr(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/eventos/stream")
                            .requestAttr(RequestDispatcher.ERROR_EXCEPTION, new IOException("Broken pipe")))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void atributosIncompletosNaoLiberamPaginaInterna() throws Exception {
        for (String ausente : new String[]{RequestDispatcher.ERROR_EXCEPTION, RequestDispatcher.ERROR_REQUEST_URI,
                RequestDispatcher.INCLUDE_REQUEST_URI}) {
            mvc.perform(get("/api/v1/eventos/stream")
                            .with(request -> {
                                request.setDispatcherType(DispatcherType.INCLUDE);
                                request.setAttribute(RequestDispatcher.INCLUDE_REQUEST_URI, "/error");
                                request.setAttribute(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/eventos/stream");
                                request.setAttribute(RequestDispatcher.ERROR_EXCEPTION, new IOException("Broken pipe"));
                                request.removeAttribute(ausente);
                                return request;
                            }))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Test
    void requestNaoLiberaPaginaMesmoComAtributosDeErro() throws Exception {
        mvc.perform(get("/error").requestAttr(RequestDispatcher.INCLUDE_REQUEST_URI, "/error")
                        .requestAttr(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/eventos/stream")
                        .requestAttr(RequestDispatcher.ERROR_EXCEPTION, new IOException("Broken pipe")))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void metodoPostNaoRecebeExcecaoDaPaginaInterna() throws Exception {
        mvc.perform(post("/error").with(request -> { request.setDispatcherType(DispatcherType.ERROR); return request; })
                        .requestAttr(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/eventos/stream")
                        .requestAttr(RequestDispatcher.ERROR_EXCEPTION, new IOException("Broken pipe")))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void erroRealDoStreamChegaAoTratamento500SemSerSuprimido() throws Exception {
        mvc.perform(get("/error")
                        .with(request -> { request.setDispatcherType(DispatcherType.ERROR); return request; })
                        .requestAttr(RequestDispatcher.ERROR_REQUEST_URI, "/api/v1/eventos/stream")
                        .requestAttr(RequestDispatcher.ERROR_EXCEPTION, new IllegalStateException("Falha controlada."))
                        .requestAttr(RequestDispatcher.ERROR_STATUS_CODE, 500))
                .andExpect(status().isInternalServerError()).andExpect(jsonPath("status").value(500));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @EnableWebSecurity
    @Import({SecurityConfiguration.class, MesaSecurity.class})
    static class ConfigTeste {
        private static final UUID ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");

        @Bean
        ObjectMapper objectMapper() {
            return JsonMapper.builder().build();
        }

        @Bean
        TenantFilter tenantFilter(ObjectMapper mapper) {
            var repository = new TenantRepository(null) {
                @Override
                public Optional<String> operationalSchemaForHost(String host) {
                    return Optional.of("t_" + "a".repeat(32));
                }
            };
            return new TenantFilter(repository, mapper);
        }

        @Bean
        IdentidadeService identidadeService() {
            return new IdentidadeService(null, null) {
                @Override
                public IdentidadeAtual validar(Jwt jwt) {
                    return new IdentidadeAtual(ID, ID, ID, "CLIENTE", true);
                }
            };
        }

        @Bean
        MesaSessaoService mesaSessaoService() {
            return new MesaSessaoService(null, null, null, null, null, null, new DataSourceTransactionManager(), null) {
                @Override
                public ParticipanteAtual validar(Jwt jwt) {
                    return new ParticipanteAtual(ID, ID, ID, ID, ID, ID);
                }
            };
        }

        @Bean
        @Primary
        JwtDecoder jwtDecoder() {
            return decoder();
        }

        @Bean("mesaJwtDecoder")
        JwtDecoder mesaJwtDecoder() {
            return decoder();
        }

        private JwtDecoder decoder() {
            return token -> Jwt.withTokenValue(token).header("alg", "RS256").subject(ID.toString())
                    .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60)).build();
        }

        @Bean
        BasicErrorController basicErrorController() {
            return new BasicErrorController(new DefaultErrorAttributes(), new ErrorProperties());
        }

        @Bean
        ApiExceptionHandler apiExceptionHandler() {
            return new ApiExceptionHandler();
        }

        @Bean
        FluxoControlado fluxoControlado() {
            return new FluxoControlado();
        }
    }

    @RestController
    static class FluxoControlado {
        SseEmitter emitter;
        int aberturas;

        @GetMapping(value = {"/api/v1/eventos/stream", "/api/v1/mesa/eventos/stream"},
                produces = MediaType.TEXT_EVENT_STREAM_VALUE)
        SseEmitter abrir() {
            aberturas++;
            emitter = new SseEmitter();
            return emitter;
        }

    }
}
