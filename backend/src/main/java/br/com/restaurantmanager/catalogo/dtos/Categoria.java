package br.com.restaurantmanager.catalogo.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record Categoria(
        @NotNull UUID id,
        @NotBlank @Size(max = 120) String nome,
        @NotNull Boolean ativa,
        @NotNull @Min(0) Long versao) {}
