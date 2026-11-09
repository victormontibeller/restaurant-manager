package br.com.restaurantmanager.delivery.dtos;

import java.util.UUID;

public record OrcamentoEntrega(
        UUID regiaoId, String regiao, String taxa, String minimo, String total, String revisao) {}
