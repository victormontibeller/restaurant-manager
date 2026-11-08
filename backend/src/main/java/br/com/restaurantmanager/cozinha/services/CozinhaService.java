package br.com.restaurantmanager.cozinha.services;

import br.com.restaurantmanager.pedidos.dtos.PedidoOperacional;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.PaginaPedidos;
import br.com.restaurantmanager.pedidos.services.PedidoComandoService;
import br.com.restaurantmanager.pedidos.services.PedidoConsultaService;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CozinhaService {
    private final PedidoConsultaService consultas;
    private final PedidoComandoService comandos;

    public CozinhaService(PedidoConsultaService consultas, PedidoComandoService comandos) {
        this.consultas = consultas;
        this.comandos = comandos;
    }

    public PaginaPedidos<PedidoOperacional> listar(IdentidadeAtual ator, UUID unidade, int pagina) {
        return consultas.listarOperacao(ator, unidade, pagina, true);
    }

    public PedidoOperacional produzir(IdentidadeAtual ator, UUID pedido, String acao, ComandoPedido comando) {
        return comandos.operacional(ator, pedido, acao, comando, null).pedido();
    }
}
