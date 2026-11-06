package br.com.restaurantmanager.identidade.controllers;

import br.com.restaurantmanager.identidade.dtos.ConfirmarVerificacaoRequest;
import br.com.restaurantmanager.identidade.dtos.RespostaMensagem;
import br.com.restaurantmanager.identidade.dtos.SolicitarVerificacaoRequest;
import br.com.restaurantmanager.identidade.services.VerificacaoEmailService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/verificacao")
public class VerificacaoEmailController {
    private final VerificacaoEmailService service;

    public VerificacaoEmailController(VerificacaoEmailService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<RespostaMensagem> solicitar(
            @Valid @RequestBody SolicitarVerificacaoRequest body,
            HttpServletRequest request) {
        service.solicitar(body.email(), request.getRemoteAddr());
        return ResponseEntity.accepted().body(new RespostaMensagem("Se a conta estiver elegível, enviaremos instruções para verificar o e-mail."));
    }

    @PostMapping("/confirmar")
    public ResponseEntity<Void> confirmar(@Valid @RequestBody ConfirmarVerificacaoRequest body, HttpServletRequest request) {
        service.confirmar(body.codigo(), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
