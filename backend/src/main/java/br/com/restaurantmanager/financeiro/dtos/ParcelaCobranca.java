package br.com.restaurantmanager.financeiro.dtos;

import java.util.UUID;

public record ParcelaCobranca(
        UUID id,
        UUID pedidoId,
        UUID unidadeComercialId,
        String tipo,
        String original,
        String abatido,
        String descricao) {}
