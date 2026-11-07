package br.com.restaurantmanager.identidade.controllers;

import br.com.restaurantmanager.identidade.dtos.ConfirmarCadastroRequest;
import br.com.restaurantmanager.identidade.dtos.RespostaMensagem;
import br.com.restaurantmanager.identidade.dtos.SolicitarCadastroRequest;
import br.com.restaurantmanager.identidade.services.CadastroClienteService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth/cadastro")
public class CadastroClienteController {
    private final CadastroClienteService service;

    public CadastroClienteController(CadastroClienteService service) {
        this.service = service;
    }

    @PostMapping
    public ResponseEntity<RespostaMensagem> solicitar(
            @Valid @RequestBody SolicitarCadastroRequest body,
            HttpServletRequest request) {
        service.solicitar(body.email(), request.getRemoteAddr());
        return ResponseEntity.accepted().body(new RespostaMensagem("Se o endereço estiver elegível, enviaremos instruções para criar a conta."));
    }

    @PostMapping("/confirmar")
    public ResponseEntity<Void> confirmar(@Valid @RequestBody ConfirmarCadastroRequest body, HttpServletRequest request) {
        service.confirmar(body.codigo(), body.senha(), request.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }
}
