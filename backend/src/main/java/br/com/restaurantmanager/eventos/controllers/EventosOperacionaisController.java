package br.com.restaurantmanager.eventos.controllers;

import br.com.restaurantmanager.eventos.dtos.PaginaEventosOperacionais;
import br.com.restaurantmanager.eventos.services.ConsultaEventosService;
import br.com.restaurantmanager.eventos.services.FluxoEventosService;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
public class EventosOperacionaisController {
    private final ConsultaEventosService consultas;
    private final FluxoEventosService fluxos;
    private final JwtDecoder empresaDecoder;
    private final JwtDecoder mesaDecoder;

    public EventosOperacionaisController(ConsultaEventosService consultas, FluxoEventosService fluxos,
            JwtDecoder empresaDecoder, @Qualifier("mesaJwtDecoder") JwtDecoder mesaDecoder) {
        this.consultas = consultas;
        this.fluxos = fluxos;
        this.empresaDecoder = empresaDecoder;
        this.mesaDecoder = mesaDecoder;
    }

    @GetMapping("/api/v1/eventos")
    public PaginaEventosOperacionais empresa(@AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam UUID unidadeId, @RequestParam(defaultValue = "-1") String depois) {
        return consultas.empresa(ator, unidadeId, depois);
    }

    @GetMapping(value = "/api/v1/eventos/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> empresaStream(@AuthenticationPrincipal IdentidadeAtual ator,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization, @RequestParam UUID unidadeId,
            @RequestParam(defaultValue = "-1") String depois) {
        Instant expira = expiracao(empresaDecoder, authorization);
        return resposta(fluxos.abrir(expira, depois, cursor -> consultas.empresa(ator, unidadeId, cursor)));
    }

    @GetMapping("/api/v1/mesa/eventos")
    public PaginaEventosOperacionais mesa(@AuthenticationPrincipal ParticipanteAtual ator,
            @RequestParam(defaultValue = "-1") String depois) {
        return consultas.mesa(ator, depois);
    }

    @GetMapping(value = "/api/v1/mesa/eventos/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> mesaStream(@AuthenticationPrincipal ParticipanteAtual ator,
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization,
            @RequestParam(defaultValue = "-1") String depois) {
        Instant expira = expiracao(mesaDecoder, authorization);
        return resposta(fluxos.abrir(expira, depois, cursor -> consultas.mesa(ator, cursor)));
    }

    private Instant expiracao(JwtDecoder decoder, String authorization) {
        try {
            return decoder.decode(authorization.substring(7)).getExpiresAt();
        } catch (JwtException erro) {
            // A validação inicial no filtro não impede o token de vencer durante a consulta da sessão.
            throw AuthFailure.invalid();
        }
    }

    private ResponseEntity<SseEmitter> resposta(SseEmitter emitter) {
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "no-store")
                .header("X-Accel-Buffering", "no").body(emitter);
    }
}
