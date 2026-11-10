package br.com.restaurantmanager.pagamentos.dtos;

import java.time.Instant;
import java.util.UUID;

public record CheckoutRegistro(
        UUID id,
        UUID pedidoId,
        UUID conexaoId,
        String valor,
        String externoId,
        String checkoutUrl,
        String estado,
        Instant criadoEm,
        UUID leaseId,
        boolean enviado,
        String retornoUrl,
        Integer prazoSegundos,
        boolean substituida) {}
