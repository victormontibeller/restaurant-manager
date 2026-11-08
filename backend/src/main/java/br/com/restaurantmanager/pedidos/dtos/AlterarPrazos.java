package br.com.restaurantmanager.pedidos.dtos;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

public record AlterarPrazos(@Min(0) long versao, @Min(1) @Max(86399) int alertaSegundos,
        @Min(2) @Max(86400) int expiracaoSegundos, boolean herdar) {}
