package br.com.restaurantmanager.mesas.dtos;

import java.util.UUID;

public record AtendimentoPersistido(
        UUID id,
        UUID mesaId,
        UUID unidadeId,
        UUID autorId,
        UUID comandaId,
        long versao) {}
