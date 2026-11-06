package br.com.restaurantmanager.identidade.controllers;

import br.com.restaurantmanager.identidade.dtos.ConfirmarRecuperacaoRequest;
import br.com.restaurantmanager.identidade.dtos.RespostaMensagem;
import br.com.restaurantmanager.identidade.dtos.SolicitarRecuperacaoRequest;
import br.com.restaurantmanager.identidade.services.RecuperacaoService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/recuperacao")
public class RecuperacaoController {
    private final RecuperacaoService service;

    public RecuperacaoController(RecuperacaoService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<RespostaMensagem> solicitar(
            @Valid @RequestBody SolicitarRecuperacaoRequest body,
            HttpServletRequest request) {
        service.solicitar(body.email(), request.getRemoteAddr());
        return ResponseEntity.accepted().body(new RespostaMensagem("Se a conta estiver elegível, enviaremos instruções de recuperação."));
    }

    @PostMapping("/confirmar")
    public ResponseEntity<Void> confirmar(@Valid @RequestBody ConfirmarRecuperacaoRequest body, HttpServletRequest request) {
        service.confirmar(body.codigo(), body.senha(), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
