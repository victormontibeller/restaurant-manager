package br.com.restaurantmanager.mesas.dtos;

import java.util.UUID;

public record ResumoComanda(
        UUID id,
        UUID unidadeId,
        UUID atendimentoId,
        UUID mesaId,
        String mesaNome,
        String estado,
        long versao,
        String totalDevido,
        String pagoConfirmado,
        String devolvidoConfirmado,
        String saldoAReceber,
        String saldoADevolver,
        boolean pendenciaFinanceira) {}
