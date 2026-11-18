package br.com.restaurantmanager.relatorios.dtos;

import java.time.Instant;
import java.util.UUID;

public record MovimentoRelatorio(UUID id, Instant registradoEm, String tipo, String valor, String metodo,
        UUID pedidoId, UUID comandaId, String mesa, String canal, String entregue,
        String troco, UUID recebimentoId) {}
