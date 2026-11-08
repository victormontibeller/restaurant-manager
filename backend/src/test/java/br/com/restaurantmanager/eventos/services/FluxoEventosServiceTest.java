package br.com.restaurantmanager.eventos.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.asyncDispatch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;

import br.com.restaurantmanager.eventos.dtos.EventoOperacionalResposta;
import br.com.restaurantmanager.eventos.dtos.PaginaEventosOperacionais;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

class FluxoEventosServiceTest {
    @Test
    void naoEnviaPaginaSeAccessTokenExpiraEnquantoConsultaEsperaLock() throws Exception {
        var controller = new ConsultaBloqueada();
        var mvc = MockMvcBuilders.standaloneSetup(controller).build();
        var resultado = mvc.perform(get("/fluxo")).andExpect(request().asyncStarted()).andReturn();
        try {
            assertThat(controller.consultando.await(3, TimeUnit.SECONDS)).isTrue();
            long restante = controller.expira.toEpochMilli() - Instant.now().toEpochMilli() + 80;
            if (restante > 0) Thread.sleep(restante);
        } finally {
            controller.liberar.countDown();
        }
        resultado.getAsyncResult(3000);
        String resposta = mvc.perform(asyncDispatch(resultado)).andReturn().getResponse().getContentAsString();
        assertThat(controller.chamadas.get()).isEqualTo(2);
        assertThat(resposta).contains("PRIMEIRO").doesNotContain("SEGUNDO");
    }

    @RestController
    static class ConsultaBloqueada {
        final CountDownLatch consultando = new CountDownLatch(1);
        final CountDownLatch liberar = new CountDownLatch(1);
        final AtomicInteger chamadas = new AtomicInteger();
        Instant expira;

        @GetMapping(value = "/fluxo", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
        SseEmitter fluxo() {
            expira = Instant.now().plusSeconds(4);
            try (var scope = TenantScope.open("t_" + "a".repeat(32))) {
                return new FluxoEventosService().abrir(expira, "-1", cursor -> {
                    int indice = chamadas.incrementAndGet();
                    if (indice == 2) {
                        consultando.countDown();
                        try {
                            if (!liberar.await(6, TimeUnit.SECONDS)) throw new AssertionError("Consulta não liberada.");
                        } catch (InterruptedException error) {
                            Thread.currentThread().interrupt();
                            throw new IllegalStateException(error);
                        }
                    }
                    return new PaginaEventosOperacionais(List.of(new EventoOperacionalResposta(
                            Integer.toString(indice), indice == 1 ? "PRIMEIRO" : "SEGUNDO", null, null, Instant.now())),
                            Integer.toString(indice), false);
                });
            }
        }
    }
}
