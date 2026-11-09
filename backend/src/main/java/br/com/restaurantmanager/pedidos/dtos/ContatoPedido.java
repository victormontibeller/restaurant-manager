package br.com.restaurantmanager.pedidos.dtos;

import java.util.UUID;

public record ContatoPedido(UUID usuarioId, long versao, String estado, String canal) {}
