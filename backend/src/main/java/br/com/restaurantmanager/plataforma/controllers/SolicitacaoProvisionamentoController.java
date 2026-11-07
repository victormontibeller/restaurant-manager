package br.com.restaurantmanager.plataforma.controllers;

import br.com.restaurantmanager.plataforma.dtos.IdentidadePlataforma;
import br.com.restaurantmanager.plataforma.dtos.PedidoProvisionamento;
import br.com.restaurantmanager.plataforma.dtos.ResumoSolicitacaoProvisionamento;
import br.com.restaurantmanager.plataforma.dtos.RetomarProvisionamento;
import br.com.restaurantmanager.plataforma.services.SolicitacaoProvisionamentoService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/plataforma/provisionamentos")
public class SolicitacaoProvisionamentoController {
    private final SolicitacaoProvisionamentoService service;

    public SolicitacaoProvisionamentoController(SolicitacaoProvisionamentoService service) {
        this.service = service;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ResumoSolicitacaoProvisionamento solicitar(
            @AuthenticationPrincipal IdentidadePlataforma ator,
            @RequestBody PedidoProvisionamento pedido) {
        return service.solicitar(ator, pedido);
    }

    @GetMapping
    public List<ResumoSolicitacaoProvisionamento> listar(
            @AuthenticationPrincipal IdentidadePlataforma ator,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.listar(ator, pagina);
    }

    @GetMapping("/{id}")
    public ResumoSolicitacaoProvisionamento consultar(
            @AuthenticationPrincipal IdentidadePlataforma ator, @PathVariable UUID id) {
        return service.consultar(ator, id);
    }

    @PostMapping("/{id}/retomar")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public ResumoSolicitacaoProvisionamento retomar(
            @AuthenticationPrincipal IdentidadePlataforma ator, @PathVariable UUID id,
            @Valid @RequestBody RetomarProvisionamento pedido) {
        return service.retomar(ator, id, pedido.versao());
    }
}
