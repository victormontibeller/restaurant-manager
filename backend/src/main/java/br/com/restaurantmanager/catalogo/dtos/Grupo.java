package br.com.restaurantmanager.catalogo.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record Grupo(
        @NotNull UUID id,
        @NotBlank @Size(max = 120) String nome,
        @NotNull @Min(0) @Max(20) Integer minimo,
        @NotNull @Min(1) @Max(20) Integer maximo,
        @NotNull @Size(min = 1, max = 20) List<@NotNull @Valid Opcao> opcoes) {}
