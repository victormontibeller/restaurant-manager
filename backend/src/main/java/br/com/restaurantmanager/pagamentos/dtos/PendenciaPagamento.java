package br.com.restaurantmanager.pagamentos.dtos;

import java.time.Instant;
import java.util.UUID;

public record PendenciaPagamento(UUID id, UUID pedidoId, String tipo, String estado,
        Instant criadoEm, String valor, int tentativas, Instant proximaTentativaEm, boolean ultimaTentativaFalhou,
        boolean emProcessamento, Boolean substituida, Boolean solicitadoAoProvedor, UUID recebimentoId,
        String canalPedido, String estadoPedido, String fuso) {}
