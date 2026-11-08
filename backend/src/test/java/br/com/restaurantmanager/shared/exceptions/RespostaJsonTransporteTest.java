package br.com.restaurantmanager.shared.exceptions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.restaurantmanager.eventos.dtos.PaginaEventosOperacionais;
import br.com.restaurantmanager.shared.dtos.ApiError;
import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import jakarta.servlet.Filter;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotWritableException;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.util.DisconnectedClientHelper;

class RespostaJsonTransporteTest {
    @Test
    void clienteEncerradoDuranteJsonNaoViraFalhaInternaNemOutraResposta() throws Exception {
        conferirDesconexao("/json", HttpMessageNotWritableException.class);
    }

    @Test
    void clienteEncerradoDuranteEventoSseInicialNaoViraFalhaInterna() throws Exception {
        conferirDesconexao("/fluxo-inicial", IllegalStateException.class);
    }

    private void conferirDesconexao(String caminho, Class<? extends Exception> tipo) throws Exception {
        var advice = new CapturaFalha();
        var mvc = MockMvcBuilders.standaloneSetup(new RespostasTeste())
                .setControllerAdvice(advice).addFilter(interromperJson()).build();
        var logger = (Logger) LoggerFactory.getLogger(ApiExceptionHandler.class);
        var eventos = new ListAppender<ILoggingEvent>();
        eventos.start();
        logger.addAppender(eventos);
        try {
            Throwable propagado = catchThrowable(() -> mvc.perform(get(caminho)));
            assertThat(advice.falha).isInstanceOf(tipo);
            assertThat(DisconnectedClientHelper.isClientDisconnectedException(advice.falha)).isTrue();
            assertThat(propagado).isNull();
            assertThat(eventos.list).noneMatch(evento -> evento.getLevel() == Level.ERROR);
        } finally {
            logger.detachAppender(eventos);
            eventos.stop();
        }
    }

    @Test
    void serializacaoInvalidaComConexaoAbertaContinuaErro500() throws Exception {
        var advice = new CapturaFalha();
        var mvc = MockMvcBuilders.standaloneSetup(new RespostasTeste()).setControllerAdvice(advice).build();
        mvc.perform(get("/json-invalido"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("codigo").value("FALHA_INTERNA"));
        assertThat(advice.falha).isInstanceOf(HttpMessageNotWritableException.class);
        assertThat(DisconnectedClientHelper.isClientDisconnectedException(advice.falha)).isFalse();
    }

    private Filter interromperJson() {
        return (request, response, chain) -> chain.doFilter(request,
                new HttpServletResponseWrapper((HttpServletResponse) response) {
                    @Override
                    public ServletOutputStream getOutputStream() throws IOException {
                        var output = super.getOutputStream();
                        return new ServletOutputStream() {
                            @Override
                            public void write(int value) throws IOException {
                                if (value == '{') throw new IOException("Broken pipe");
                                output.write(value);
                            }

                            @Override
                            public boolean isReady() {
                                return output.isReady();
                            }

                            @Override
                            public void setWriteListener(WriteListener listener) {
                                output.setWriteListener(listener);
                            }
                        };
                    }
                });
    }

    @RestControllerAdvice
    static class CapturaFalha extends ApiExceptionHandler {
        Exception falha;

        @Override
        @ExceptionHandler(Exception.class)
        ResponseEntity<ApiError> unexpected(Exception error) {
            falha = error;
            return super.unexpected(error);
        }
    }

    @RestController
    static class RespostasTeste {
        @GetMapping("/json")
        PaginaEventosOperacionais json() {
            return new PaginaEventosOperacionais(List.of(), "0", false);
        }

        @GetMapping(value = "/fluxo-inicial", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
        SseEmitter fluxoInicial() throws IOException {
            var emitter = new SseEmitter();
            emitter.send(SseEmitter.event().name("atualizacao").data(json()));
            return emitter;
        }

        @GetMapping("/json-invalido")
        ValorInvalido jsonInvalido() {
            return new ValorInvalido();
        }
    }

    static class ValorInvalido {
        public String getValor() {
            throw new IllegalStateException("Falha controlada de serialização.");
        }
    }
}
