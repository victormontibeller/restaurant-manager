package br.com.restaurantmanager.plataforma.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AlterarEstadoEmpresa(
        @NotNull @Min(0) Long versao,
        @NotBlank String estado,
        @NotBlank @Size(max = 240) String motivo) {}
