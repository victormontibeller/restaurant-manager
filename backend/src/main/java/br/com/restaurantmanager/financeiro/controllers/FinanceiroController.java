package br.com.restaurantmanager.financeiro.controllers;

import br.com.restaurantmanager.financeiro.dtos.ConfirmarDevolucao;
import br.com.restaurantmanager.financeiro.dtos.DetalheFinanceiro;
import br.com.restaurantmanager.financeiro.dtos.EntradaAjuste;
import br.com.restaurantmanager.financeiro.dtos.EntradaDevolucao;
import br.com.restaurantmanager.financeiro.dtos.EntradaRecebimento;
import br.com.restaurantmanager.financeiro.services.MovimentoFinanceiroService;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;

import jakarta.validation.Valid;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/financeiro/{tipo:pedidos|comandas}/{id}")
public class FinanceiroController {
    private final MovimentoFinanceiroService service;

    public FinanceiroController(MovimentoFinanceiroService service) {
        this.service = service;
    }

    @GetMapping
    public DetalheFinanceiro consultar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable String tipo,
            @PathVariable UUID id) {
        return service.consultar(ator, id, tipo.equals("comandas"));
    }

    @PostMapping("/recebimentos")
    public DetalheFinanceiro receber(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable String tipo,
            @PathVariable UUID id,
            @Valid @RequestBody EntradaRecebimento body) {
        return service.receber(ator, id, tipo.equals("comandas"), body);
    }

    @PostMapping("/ajustes")
    public DetalheFinanceiro ajustar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable String tipo,
            @PathVariable UUID id,
            @Valid @RequestBody EntradaAjuste body) {
        return service.ajustar(ator, id, tipo.equals("comandas"), body);
    }

    @PostMapping("/devolucoes")
    public DetalheFinanceiro devolver(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable String tipo,
            @PathVariable UUID id,
            @Valid @RequestBody EntradaDevolucao body) {
        return service.devolver(ator, id, tipo.equals("comandas"), body);
    }

    @PostMapping("/devolucoes/{devolucao}/confirmar")
    public DetalheFinanceiro confirmar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable String tipo,
            @PathVariable UUID id,
            @PathVariable UUID devolucao,
            @Valid @RequestBody ConfirmarDevolucao body) {
        return service.confirmar(ator, id, tipo.equals("comandas"), devolucao, body);
    }
}
