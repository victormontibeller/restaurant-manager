package br.com.restaurantmanager.mesas.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AlterarMesa(
        @NotNull @Min(0) Long versao,
        @NotBlank @Size(max = 80) String nome,
        @NotNull Boolean ativa) {}
