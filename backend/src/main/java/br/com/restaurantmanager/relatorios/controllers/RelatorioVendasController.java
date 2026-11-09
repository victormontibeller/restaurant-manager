package br.com.restaurantmanager.relatorios.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.relatorios.dtos.RelatorioVendas;
import br.com.restaurantmanager.relatorios.services.RelatorioVendasService;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.UUID;

@RestController
public class RelatorioVendasController {
    private final RelatorioVendasService service;

    public RelatorioVendasController(RelatorioVendasService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/relatorios/vendas")
    public RelatorioVendas consultar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam UUID unidadeId,
            @RequestParam LocalDate inicio,
            @RequestParam LocalDate fim) {
        return service.consultar(ator, unidadeId, inicio, fim);
    }
}
