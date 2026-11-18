package br.com.restaurantmanager.comunicacoes.dtos;

import java.time.Instant;
import java.util.UUID;

public record NotificacaoOperacional(
        UUID id, UUID pedidoId, String tipo, String estado, int tentativas,
        Instant criadaEm, Instant proximaTentativaEm, boolean emProcessamento, boolean ultimaTentativaFalhou,
        String canalPedido, String estadoPedido, String fuso) {}
