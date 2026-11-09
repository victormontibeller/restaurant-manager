package br.com.restaurantmanager.pagamentos.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pagamentos.dtos.CheckoutResumo;
import br.com.restaurantmanager.pagamentos.services.CheckoutService;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class CheckoutController {
    private final CheckoutService service;

    public CheckoutController(CheckoutService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/me/pedidos/{id}/pagamento")
    public List<CheckoutResumo> listar(
            @AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.listar(ator, id);
    }

    @PostMapping("/api/v1/me/pedidos/{id}/pagamento/tentativas/{intencao}")
    public List<CheckoutResumo> tentar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable UUID id,
            @PathVariable UUID intencao) {
        return service.novaTentativa(ator, id, intencao);
    }
}
