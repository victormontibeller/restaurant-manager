package br.com.restaurantmanager.mesas.dtos;

import java.util.UUID;

public record ContextoComanda(
        UUID id,
        UUID unidadeId,
        UUID atendimentoId,
        String estado,
        long versao) {}
