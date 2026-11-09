package br.com.restaurantmanager.financeiro.dtos;

import java.time.Instant;
import java.util.UUID;

public record Devolucao(
        UUID id,
        UUID recebimentoId,
        String valor,
        String motivo,
        String estado,
        Instant criadaEm,
        Instant confirmadaEm) {}
