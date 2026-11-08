package br.com.restaurantmanager.pedidos.controllers;

import br.com.restaurantmanager.pedidos.dtos.PedidoOperacional;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.pedidos.dtos.PaginaPedidos;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.services.EnvioPedidoService;
import br.com.restaurantmanager.pedidos.services.PedidoComandoService;
import br.com.restaurantmanager.pedidos.services.PedidoConsultaService;
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
public class PedidoOperacaoController {
    private final EnvioPedidoService envio;
    private final PedidoConsultaService consultas;
    private final PedidoComandoService comandos;

    public PedidoOperacaoController(EnvioPedidoService envio, PedidoConsultaService consultas, PedidoComandoService comandos) {
        this.envio = envio;
        this.consultas = consultas;
        this.comandos = comandos;
    }

    @PostMapping("/api/v1/operacao/pedidos")
    public PedidoOperacional enviar(@AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody EnviarPedido body) {
        return envio.assistido(ator, body);
    }

    @GetMapping("/api/v1/operacao/pedidos")
    public PaginaPedidos<PedidoOperacional> listar(@AuthenticationPrincipal IdentidadeAtual ator, @RequestParam UUID unidadeId,
            @RequestParam(defaultValue = "0") int pagina) {
        return consultas.listarOperacao(ator, unidadeId, pagina, false);
    }

    @GetMapping({"/api/v1/operacao/pedidos/{id}", "/api/v1/operacao/pedidos/intencoes/{id}"})
    public PedidoOperacional consultar(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return consultas.operacional(ator, id);
    }

    @PostMapping("/api/v1/operacao/pedidos/{id}/{acao:aceitar|recusar|cancelar|servir}")
    public PedidoOperacional comando(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @PathVariable String acao, @Valid @RequestBody ComandoPedido body) {
        var resultado = comandos.operacional(ator, id, acao, body, null);
        if (resultado.expirado()) throw ErrosPedido.conflito("O prazo de aceite expirou e o pedido foi cancelado.");
        return resultado.pedido();
    }

    @PostMapping("/api/v1/operacao/pedidos/{id}/solicitacoes/{solicitacaoId}/{acao:aprovar|rejeitar}")
    public PedidoOperacional decidir(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @PathVariable UUID solicitacaoId, @PathVariable String acao, @Valid @RequestBody ComandoPedido body) {
        return comandos.operacional(ator, id, acao, body, solicitacaoId).pedido();
    }
}
