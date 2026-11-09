package br.com.restaurantmanager.comunicacoes.dtos;

import java.util.UUID;

public record NotificacaoOperacional(
        UUID id, UUID pedidoId, String tipo, String estado, int tentativas) {}
