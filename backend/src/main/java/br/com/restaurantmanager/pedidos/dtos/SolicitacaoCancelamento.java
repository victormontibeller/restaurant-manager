package br.com.restaurantmanager.pedidos.dtos;

import java.time.Instant;
import java.util.UUID;

public record SolicitacaoCancelamento(UUID id, String motivo, String estado, Instant criadaEm) {}
