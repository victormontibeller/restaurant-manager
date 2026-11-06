package br.com.restaurantmanager.plataforma.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record RetomarProvisionamento(
        @NotNull @Min(0) Long versao) {}
