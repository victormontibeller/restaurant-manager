package br.com.restaurantmanager.pedidos.dtos;

import br.com.restaurantmanager.pedidos.models.EstadoProducao;
import java.time.Instant;
import java.util.UUID;

public record UnidadeProducao(UUID id, UUID linhaId, EstadoProducao estado,
        Instant iniciadoEm, Instant concluidoEm) {}
