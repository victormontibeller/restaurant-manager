package br.com.restaurantmanager.pagamentos.dtos;

import java.util.UUID;

public record PendenciaPagamento(UUID id, UUID pedidoId, String tipo, String estado) {}
