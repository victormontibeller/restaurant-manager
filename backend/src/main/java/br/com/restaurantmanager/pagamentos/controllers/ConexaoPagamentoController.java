package br.com.restaurantmanager.pagamentos.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pagamentos.dtos.AutorizacaoPagamento;
import br.com.restaurantmanager.pagamentos.dtos.StatusConexao;
import br.com.restaurantmanager.pagamentos.services.ConexaoPagamentoService;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ConexaoPagamentoController {
    private final ConexaoPagamentoService service;

    public ConexaoPagamentoController(ConexaoPagamentoService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/integracoes/mercadopago")
    public ResponseEntity<StatusConexao> consultar(@AuthenticationPrincipal IdentidadeAtual ator) {
        var conexao = service.consultar(ator);
        return conexao == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(conexao);
    }

    @PostMapping("/api/v1/integracoes/mercadopago/autorizar")
    public AutorizacaoPagamento iniciar(
            @AuthenticationPrincipal IdentidadeAtual ator, HttpServletRequest request) {
        return service.iniciar(ator, request.getServerName());
    }

    @GetMapping("/api/v1/integracoes/mercadopago/retorno")
    public void concluir(
            @RequestParam String state, @RequestParam String code, HttpServletResponse response) {
        service.concluir(state, code);
        response.setStatus(303);
        response.setHeader("Location", "/gestao/integracoes?conexao=concluida");
    }
}
