package br.com.restaurantmanager.pedidos.dtos;

import java.util.List;

public record PaginaPedidos<T>(List<T> itens, boolean mais) {}
