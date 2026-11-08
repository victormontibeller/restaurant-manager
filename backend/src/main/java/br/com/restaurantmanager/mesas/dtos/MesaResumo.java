package br.com.restaurantmanager.mesas.dtos;

import java.util.UUID;

public record MesaResumo(
        UUID id,
        UUID unidadeId,
        String nome,
        boolean ativa,
        long versao,
        UUID atendimentoId,
        UUID comandaId,
        String estadoComanda,
        Long atendimentoVersao) {}
