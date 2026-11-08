package br.com.restaurantmanager.shared.exceptions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class ApiExceptionHandlerTest {
    @Test
    void encerramentoDoTransporteSseNaoTentaEscreverErroJson() throws Exception {
        var controller = new TransporteTeste();
        var mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new ApiExceptionHandler()).build();
        var inicial = mvc.perform(get("/fluxo")).andExpect(request().asyncStarted()).andReturn();

        controller.emitter.send(SseEmitter.event().comment("conexao"));
        assertThat(inicial.getResponse().isCommitted()).isTrue();
        assertThat(inicial.getResponse().getContentType()).startsWith(MediaType.TEXT_EVENT_STREAM_VALUE);
        String enviado = inicial.getResponse().getContentAsString();
        var encerramento = new AsyncRequestNotUsableException("Conexão encerrada pelo cliente.");
        controller.emitter.completeWithError(encerramento);

        var finalizado = mvc.perform(asyncDispatch(inicial))
                .andExpect(status().isOk())
                .andExpect(content().string(enviado)).andReturn();
        assertThat(finalizado.getResolvedException()).isSameAs(encerramento);
        assertThat(enviado).contains(":conexao").doesNotContain("FALHA_INTERNA");
    }

    @Test
    void falhaDeNegocioContinuaComStatusECorpoJson() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new TransporteTeste())
                .setControllerAdvice(new ApiExceptionHandler()).build();

        mvc.perform(get("/regra"))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("codigo").value("OPERACAO_INDISPONIVEL"))
                .andExpect(jsonPath("mensagem").value("A operação não está disponível."));
    }

    @Test
    void autorizacaoNegadaAntesDeAbrirSseRetornaErroJson() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new TransporteTeste())
                .setControllerAdvice(new ApiExceptionHandler()).build();

        mvc.perform(get("/fluxo-negado").accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("codigo").value("ACESSO_NEGADO"))
                .andExpect(jsonPath("mensagem").value("Você não pode acompanhar esta unidade."));
    }

    @Test
    void entradaInvalidaAntesDeAbrirSseRetornaErroJson() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new TransporteTeste())
                .setControllerAdvice(new ApiExceptionHandler()).build();

        mvc.perform(get("/fluxo-validado").param("unidadeId", "invalida").accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("codigo").value("ENTRADA_INVALIDA"));
    }

    @Test
    void falhaInternaComTransporteDisponivelContinuaSendoReportada() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new TransporteTeste())
                .setControllerAdvice(new ApiExceptionHandler()).build();

        mvc.perform(get("/falha").accept(MediaType.TEXT_EVENT_STREAM))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("codigo").value("FALHA_INTERNA"));
    }

    @RestController
    static class TransporteTeste {
        final SseEmitter emitter = new SseEmitter();

        @GetMapping(value = "/fluxo", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
        SseEmitter fluxo() {
            return emitter;
        }

        @GetMapping(value = "/fluxo-negado", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
        SseEmitter fluxoNegado() {
            throw new AuthFailure(403, "ACESSO_NEGADO", "Você não pode acompanhar esta unidade.");
        }

        @GetMapping(value = "/fluxo-validado", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
        SseEmitter fluxoValidado(@RequestParam UUID unidadeId) {
            return emitter;
        }

        @GetMapping("/regra")
        void regra() {
            throw new AuthFailure(409, "OPERACAO_INDISPONIVEL", "A operação não está disponível.");
        }

        @GetMapping("/falha")
        void falha() {
            throw new IllegalStateException("Falha de teste.");
        }
    }
}
