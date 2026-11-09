package br.com.restaurantmanager.financeiro.dtos;

import java.util.UUID;

public record DevolucaoOnlineTrabalho(
        UUID id,
        UUID checkoutId,
        UUID cobrancaId,
        UUID pedidoId,
        String transacao,
        String valor,
        UUID leaseId) {}
