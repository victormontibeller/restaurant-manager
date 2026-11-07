package br.com.restaurantmanager.unidades.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CriarUnidade(
        @NotNull UUID id,
        @NotBlank @Size(max = 120) String nome,
        @NotBlank @Size(max = 60) String fuso,
        @NotNull Boolean ativa) {}
