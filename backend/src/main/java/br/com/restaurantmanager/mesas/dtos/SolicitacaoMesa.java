package br.com.restaurantmanager.mesas.dtos;

import java.time.Instant;
import java.util.UUID;

public record SolicitacaoMesa(
        UUID id,
        UUID comandaId,
        String mesaNome,
        String tipo,
        String estado,
        Instant criadaEm,
        long versao) {}
