package br.com.restaurantmanager.mesas.models;

import java.util.UUID;

public record ParticipanteAtual(
        UUID participanteId,
        UUID sessaoId,
        UUID empresaId,
        UUID atendimentoId,
        UUID comandaId,
        UUID unidadeId) {}
