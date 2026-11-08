package br.com.restaurantmanager.cozinha.controllers;

import br.com.restaurantmanager.pedidos.dtos.PedidoOperacional;
import br.com.restaurantmanager.cozinha.services.CozinhaService;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.PaginaPedidos;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CozinhaController {
    private final CozinhaService service;

    public CozinhaController(CozinhaService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/cozinha")
    public PaginaPedidos<PedidoOperacional> listar(@AuthenticationPrincipal IdentidadeAtual ator, @RequestParam UUID unidadeId,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.listar(ator, unidadeId, pagina);
    }

    @PostMapping("/api/v1/cozinha/pedidos/{id}/{acao:iniciar|concluir}")
    public PedidoOperacional produzir(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @PathVariable String acao, @Valid @RequestBody ComandoPedido body) {
        return service.produzir(ator, id, acao, body);
    }
}
