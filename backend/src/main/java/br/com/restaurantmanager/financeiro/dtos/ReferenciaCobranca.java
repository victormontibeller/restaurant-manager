package br.com.restaurantmanager.financeiro.dtos;

import java.util.UUID;

public record ReferenciaCobranca(UUID id, UUID unidadeId, UUID pedidoId, UUID comandaId) {}
