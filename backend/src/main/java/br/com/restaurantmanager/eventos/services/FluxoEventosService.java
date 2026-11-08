package br.com.restaurantmanager.eventos.services;

import br.com.restaurantmanager.eventos.dtos.PaginaEventosOperacionais;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import java.io.IOException;
import java.time.Instant;
import java.util.concurrent.Semaphore;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class FluxoEventosService {
    private final Semaphore capacidade = new Semaphore(32);

    public SseEmitter abrir(Instant expiraEm, String cursor, Function<String, PaginaEventosOperacionais> consulta) {
        if (!capacidade.tryAcquire()) {
            throw new AuthFailure(503, "ACOMPANHAMENTO_OCUPADO", "Acompanhamento ocupado. A consulta periódica continua disponível.");
        }
        PaginaEventosOperacionais inicial;
        try {
            inicial = consulta.apply(cursor);
        } catch (RuntimeException erro) {
            capacidade.release();
            throw erro;
        }
        String schema = TenantScope.current();
        var emitter = new SseEmitter(55000L);
        var encerrado = new AtomicBoolean();
        emitter.onCompletion(() -> encerrado.set(true));
        emitter.onTimeout(() -> { encerrado.set(true); emitter.complete(); });
        emitter.onError(erro -> encerrado.set(true));
        Thread.ofVirtual().name("eventos-operacionais").start(() -> {
            Instant limite = Instant.now().plusSeconds(50);
            try {
                PaginaEventosOperacionais pagina = inicial;
                String proximo = cursor;
                long ultimoHeartbeat = 0;
                boolean primeira = true;
                while (!encerrado.get() && Instant.now().isBefore(limite) && Instant.now().isBefore(expiraEm)) {
                    if (!primeira) {
                        try (var scope = TenantScope.open(schema)) {
                            pagina = consulta.apply(proximo);
                        }
                    }
                    // A espera por um lock pode atravessar a validade do token.
                    // A sessão durável não prolonga a autorização deste access token.
                    if (encerrado.get() || !Instant.now().isBefore(expiraEm) || !Instant.now().isBefore(limite)) {
                        break;
                    }
                    // A consulta transacional e seus locks terminam antes de qualquer escrita na rede.
                    if (primeira || !pagina.eventos().isEmpty()) {
                        emitter.send(SseEmitter.event().name("atualizacao").id(pagina.proximo()).data(pagina));
                    } else if (System.nanoTime() - ultimoHeartbeat > 15000000000L) {
                        emitter.send(SseEmitter.event().comment("conexao"));
                        ultimoHeartbeat = System.nanoTime();
                    }
                    primeira = false;
                    proximo = pagina.proximo();
                    if (!pagina.temMais()) Thread.sleep(1000);
                }
                emitter.complete();
            } catch (IOException | AuthFailure erro) {
                emitter.complete();
            } catch (InterruptedException erro) {
                Thread.currentThread().interrupt();
                emitter.complete();
            } catch (RuntimeException erro) {
                emitter.completeWithError(erro);
            } finally {
                capacidade.release();
            }
        });
        return emitter;
    }
}
