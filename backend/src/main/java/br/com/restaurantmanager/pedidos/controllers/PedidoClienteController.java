package br.com.restaurantmanager.pedidos.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.pedidos.dtos.PaginaPedidos;
import br.com.restaurantmanager.pedidos.dtos.PedidoDetalhe;
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
public class PedidoClienteController {
    private final EnvioPedidoService envio;
    private final PedidoConsultaService consultas;
    private final PedidoComandoService comandos;

    public PedidoClienteController(EnvioPedidoService envio, PedidoConsultaService consultas, PedidoComandoService comandos) {
        this.envio = envio;
        this.consultas = consultas;
        this.comandos = comandos;
    }

    @PostMapping("/api/v1/pedidos")
    public PedidoDetalhe enviar(@AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody EnviarPedido body) {
        return envio.cliente(ator, body);
    }

    @GetMapping("/api/v1/me/pedidos")
    public PaginaPedidos<PedidoDetalhe> listar(@AuthenticationPrincipal IdentidadeAtual ator, @RequestParam(defaultValue = "0") int pagina) {
        return consultas.listarCliente(ator, pagina);
    }

    @GetMapping({"/api/v1/me/pedidos/{id}", "/api/v1/me/pedidos/intencoes/{id}"})
    public PedidoDetalhe consultar(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return consultas.cliente(ator, id);
    }

    @PostMapping("/api/v1/me/pedidos/{id}/{acao:cancelar|solicitar-cancelamento}")
    public PedidoDetalhe comando(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @PathVariable String acao, @Valid @RequestBody ComandoPedido body) {
        return comandos.cliente(ator, id, acao, body);
    }
}
