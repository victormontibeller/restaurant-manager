package br.com.restaurantmanager.pedidos.dtos;

import java.util.UUID;

public record TrabalhoDeadline(UUID pedidoId, UUID leaseId) {}
