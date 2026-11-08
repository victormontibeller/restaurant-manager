package br.com.restaurantmanager.cozinha.services;

import br.com.restaurantmanager.pedidos.dtos.PedidoOperacional;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.PaginaPedidos;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.pedidos.models.OrdenacaoPedidos;
import br.com.restaurantmanager.pedidos.services.PedidoComandoService;
import br.com.restaurantmanager.pedidos.services.PedidoConsultaService;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.util.List;
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

    public PaginaPedidos<PedidoOperacional> listar(IdentidadeAtual ator, UUID unidade, int pagina,
            List<EstadoPedido> estados, CanalAtendimento canal, OrdenacaoPedidos ordenacao) {
        return consultas.listarOperacao(ator, unidade, pagina, true, estados, canal, ordenacao);
    }

    public PedidoOperacional produzir(IdentidadeAtual ator, UUID pedido, String acao, ComandoPedido comando) {
        return comandos.operacional(ator, pedido, acao, comando, null).pedido();
    }
}
