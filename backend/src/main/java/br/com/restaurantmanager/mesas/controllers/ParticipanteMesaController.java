package br.com.restaurantmanager.mesas.controllers;

import br.com.restaurantmanager.mesas.dtos.ResumoComanda;
import br.com.restaurantmanager.mesas.dtos.SolicitacaoMesa;
import br.com.restaurantmanager.mesas.dtos.SolicitarMesa;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.mesas.services.FechamentoComandaService;
import br.com.restaurantmanager.mesas.services.SolicitacaoMesaService;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/mesa")
public class ParticipanteMesaController {
    private final FechamentoComandaService comandas;
    private final SolicitacaoMesaService solicitacoes;

    public ParticipanteMesaController(FechamentoComandaService comandas, SolicitacaoMesaService solicitacoes) {
        this.comandas = comandas;
        this.solicitacoes = solicitacoes;
    }

    @GetMapping("/sessao")
    public ParticipanteAtual sessao(@AuthenticationPrincipal ParticipanteAtual ator) {
        return ator;
    }

    @GetMapping("/comanda")
    public ResumoComanda comanda(@AuthenticationPrincipal ParticipanteAtual ator) {
        return comandas.consultarParticipante(ator);
    }

    @PostMapping("/solicitacoes")
    public SolicitacaoMesa solicitar(@AuthenticationPrincipal ParticipanteAtual ator, @Valid @RequestBody SolicitarMesa body) {
        return solicitacoes.solicitar(ator, body);
    }
}
