package br.com.restaurantmanager.financeiro.dtos;

import java.time.Instant;
import java.util.UUID;

public record Recebimento(
        UUID id,
        String metodo,
        String valor,
        String entregue,
        String troco,
        Instant confirmadoEm) {}
