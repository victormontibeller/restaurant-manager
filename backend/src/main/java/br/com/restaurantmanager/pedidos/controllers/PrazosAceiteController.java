package br.com.restaurantmanager.pedidos.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pedidos.dtos.AlterarPrazos;
import br.com.restaurantmanager.pedidos.dtos.PrazosAceite;
import br.com.restaurantmanager.pedidos.services.PrazosAceiteService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PrazosAceiteController {
    private final PrazosAceiteService service;

    public PrazosAceiteController(PrazosAceiteService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/configuracoes/prazos-aceite")
    public PrazosAceite empresa(@AuthenticationPrincipal IdentidadeAtual ator) {
        return service.consultar(ator, null);
    }

    @PutMapping("/api/v1/configuracoes/prazos-aceite")
    public PrazosAceite empresa(@AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody AlterarPrazos body) {
        return service.alterar(ator, null, body);
    }

    @GetMapping("/api/v1/configuracoes/unidades/{id}/prazos-aceite")
    public PrazosAceite unidade(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.consultar(ator, id);
    }

    @PutMapping("/api/v1/configuracoes/unidades/{id}/prazos-aceite")
    public PrazosAceite unidade(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id, @Valid @RequestBody AlterarPrazos body) {
        return service.alterar(ator, id, body);
    }
}
