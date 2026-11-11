package br.com.restaurantmanager.cozinha.dtos;

import br.com.restaurantmanager.pedidos.dtos.PedidoOperacional;
import java.time.Instant;

public record CartaoCozinha(PedidoOperacional pedido, String mesaNome, Instant prontoEm) {}
