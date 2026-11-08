package br.com.restaurantmanager.mesas.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.mesas.dtos.ResumoComanda;
import br.com.restaurantmanager.mesas.dtos.VersaoComanda;
import br.com.restaurantmanager.mesas.services.FechamentoComandaService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/comandas")
public class ComandaController {
    private final FechamentoComandaService service;

    public ComandaController(FechamentoComandaService service) {
        this.service = service;
    }

    @GetMapping("/{id}")
    public ResumoComanda consultar(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.consultar(ator, id);
    }

    @PostMapping("/{id}/{comando:iniciar-fechamento|reabrir|concluir}")
    public ResumoComanda alterar(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @PathVariable String comando, @Valid @RequestBody VersaoComanda body) {
        return service.alterar(ator, id, body.versao(), comando);
    }
}
