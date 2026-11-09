package br.com.restaurantmanager.comunicacoes.controllers;

import br.com.restaurantmanager.comunicacoes.dtos.NotificacaoOperacional;
import br.com.restaurantmanager.comunicacoes.services.NotificacaoService;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class NotificacaoController {
    private final NotificacaoService service;

    public NotificacaoController(NotificacaoService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/operacao/notificacoes")
    public List<NotificacaoOperacional> listar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam UUID unidadeId,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.listar(ator, unidadeId, pagina);
    }
}
