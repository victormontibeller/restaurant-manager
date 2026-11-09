package br.com.restaurantmanager.delivery.controllers;

import br.com.restaurantmanager.delivery.dtos.ComandoOcorrencia;
import br.com.restaurantmanager.delivery.dtos.PedidoExpedicao;
import br.com.restaurantmanager.delivery.services.ExpedicaoService;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pedidos.dtos.PaginaPedidos;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
public class ExpedicaoController {
    private final ExpedicaoService service;

    public ExpedicaoController(ExpedicaoService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/expedicao")
    public PaginaPedidos<PedidoExpedicao> listar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam UUID unidadeId,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.listar(ator, unidadeId, pagina);
    }

    @PostMapping("/api/v1/expedicao/pedidos/{id}/{acao:ocorrencia|decidir}")
    public PedidoExpedicao ocorrencia(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable UUID id,
            @PathVariable String acao,
            @Valid @RequestBody ComandoOcorrencia body) {
        return service.ocorrencia(ator, id, acao.equals("decidir"), body);
    }
}
