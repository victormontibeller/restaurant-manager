package br.com.restaurantmanager.pagamentos.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pagamentos.dtos.PendenciaPagamento;
import br.com.restaurantmanager.pagamentos.services.PendenciaPagamentoService;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
public class PendenciaPagamentoController {
    private final PendenciaPagamentoService service;

    public PendenciaPagamentoController(PendenciaPagamentoService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/operacao/pagamentos")
    public List<PendenciaPagamento> listar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam UUID unidadeId,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.listar(ator, unidadeId, pagina);
    }

    @PostMapping("/api/v1/operacao/pagamentos/{tipo:checkout|devolucao}/{id}/reconciliar")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reconciliar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable String tipo,
            @PathVariable UUID id) {
        service.reconciliar(ator, id, tipo.equals("devolucao"));
    }
}
