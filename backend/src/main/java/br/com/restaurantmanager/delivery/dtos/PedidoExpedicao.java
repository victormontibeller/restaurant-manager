package br.com.restaurantmanager.delivery.dtos;

import br.com.restaurantmanager.pedidos.dtos.EnderecoEntrega;
import br.com.restaurantmanager.pedidos.dtos.PedidoOperacional;

public record PedidoExpedicao(
        PedidoOperacional pedido,
        EnderecoEntrega endereco,
        OrcamentoEntrega entrega,
        OcorrenciaEntrega ocorrencia) {}
