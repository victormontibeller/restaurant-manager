package br.com.restaurantmanager.shared.exceptions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowable;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;

import br.com.restaurantmanager.eventos.dtos.PaginaEventosOperacionais;
import jakarta.servlet.ServletOutputStream;
import jakarta.servlet.WriteListener;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.util.DisconnectedClientHelper;

class SseTransporteTest {
    @Test
    void jacksonEncapsulaFalhaDoTransporteDuranteJsonDoEvento() throws Exception {
        var controller = new FluxoTeste();
        var mvc = MockMvcBuilders.standaloneSetup(controller).addFilter((request, response, chain) -> {
            var wrapped = new HttpServletResponseWrapper((HttpServletResponse) response) {
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
            };
            chain.doFilter(request, wrapped);
        }).build();
        mvc.perform(get("/fluxo").accept(MediaType.TEXT_EVENT_STREAM)).andExpect(request().asyncStarted());

        Throwable erro = catchThrowable(() -> controller.emitter.send(SseEmitter.event()
                .name("atualizacao").data(new PaginaEventosOperacionais(List.of(), "0", false))));

        assertThat(erro).isInstanceOf(IllegalStateException.class);
        var tipos = new ArrayList<String>();
        for (Throwable causa = erro; causa != null; causa = causa.getCause()) {
            tipos.add(causa.getClass().getSimpleName());
        }
        assertThat(tipos).contains("HttpMessageNotWritableException", "AsyncRequestNotUsableException", "IOException");
        assertThat(DisconnectedClientHelper.isClientDisconnectedException(erro)).isTrue();
    }

    @RestController
    static class FluxoTeste {
        final SseEmitter emitter = new SseEmitter();

        @GetMapping(value = "/fluxo", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
        SseEmitter fluxo() {
            return emitter;
        }
    }
}
