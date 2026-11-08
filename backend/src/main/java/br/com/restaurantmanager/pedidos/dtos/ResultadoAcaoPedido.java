package br.com.restaurantmanager.pedidos.dtos;


/** A expiração deve confirmar antes de o controller traduzir o conflito HTTP. */
public record ResultadoAcaoPedido(PedidoOperacional pedido, boolean expirado) {}
