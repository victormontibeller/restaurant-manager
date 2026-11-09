package br.com.restaurantmanager.delivery.controllers;

import br.com.restaurantmanager.delivery.dtos.EnderecoCliente;
import br.com.restaurantmanager.delivery.services.EnderecoClienteService;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class EnderecoClienteController {
    private final EnderecoClienteService service;

    public EnderecoClienteController(EnderecoClienteService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/clientes/me/enderecos")
    public List<EnderecoCliente> listar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.listar(ator, pagina);
    }

    @PutMapping("/api/v1/clientes/me/enderecos/{id}")
    public EnderecoCliente salvar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable UUID id,
            @Valid @RequestBody EnderecoCliente body) {
        if (!id.equals(body.id()))
            throw ErrosPedido.regra("O identificador do endereço diverge da rota.");
        return service.salvar(ator, body);
    }
}
