package br.com.restaurantmanager.unidades.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AlterarUnidade(
        @NotNull @Min(0) Long versao,
        @NotBlank @Size(max = 120) String nome,
        @NotBlank @Size(max = 60) String fuso,
        @NotNull Boolean ativa) {}
