package br.com.restaurantmanager.pedidos.controllers;

import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
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
public class PedidoMesaController {
    private final EnvioPedidoService envio;
    private final PedidoConsultaService consultas;
    private final PedidoComandoService comandos;

    public PedidoMesaController(EnvioPedidoService envio, PedidoConsultaService consultas, PedidoComandoService comandos) {
        this.envio = envio;
        this.consultas = consultas;
        this.comandos = comandos;
    }

    @PostMapping("/api/v1/mesa/pedidos")
    public PedidoDetalhe enviar(@AuthenticationPrincipal ParticipanteAtual ator, @Valid @RequestBody EnviarPedido body) {
        return envio.participante(ator, body);
    }

    @GetMapping("/api/v1/mesa/pedidos")
    public PaginaPedidos<PedidoDetalhe> listar(@AuthenticationPrincipal ParticipanteAtual ator, @RequestParam(defaultValue = "0") int pagina) {
        return consultas.listarParticipante(ator, pagina);
    }

    @GetMapping({"/api/v1/mesa/pedidos/{id}", "/api/v1/mesa/pedidos/intencoes/{id}"})
    public PedidoDetalhe consultar(@AuthenticationPrincipal ParticipanteAtual ator, @PathVariable UUID id) {
        return consultas.participante(ator, id);
    }

    @PostMapping("/api/v1/mesa/pedidos/{id}/{acao:cancelar|solicitar-cancelamento}")
    public PedidoDetalhe comando(@AuthenticationPrincipal ParticipanteAtual ator, @PathVariable UUID id,
            @PathVariable String acao, @Valid @RequestBody ComandoPedido body) {
        return comandos.participante(ator, id, acao, body);
    }
}
