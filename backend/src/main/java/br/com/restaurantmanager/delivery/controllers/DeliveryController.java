package br.com.restaurantmanager.delivery.controllers;

import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.delivery.dtos.ConfigDelivery;
import br.com.restaurantmanager.delivery.dtos.OrcamentarEntrega;
import br.com.restaurantmanager.delivery.dtos.OrcamentoEntrega;
import br.com.restaurantmanager.delivery.services.DeliveryService;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class DeliveryController {
    private final DeliveryService service;

    public DeliveryController(DeliveryService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/configuracoes/unidades/{id}/delivery")
    public ConfigDelivery consultar(
            @AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.consultar(ator, id);
    }

    @PutMapping("/api/v1/configuracoes/unidades/{id}/delivery")
    public ConfigDelivery salvar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable UUID id,
            @Valid @RequestBody ConfigDelivery body) {
        return service.salvar(ator, id, body);
    }

    @PostMapping("/api/v1/delivery/orcamento")
    public OrcamentoEntrega orcar(@Valid @RequestBody OrcamentarEntrega body) {
        return service.orcar(body.unidadeId(), body.cep(), Dinheiro.ler(body.subtotal()));
    }
}
