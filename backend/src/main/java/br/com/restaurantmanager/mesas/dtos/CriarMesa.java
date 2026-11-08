package br.com.restaurantmanager.mesas.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

public record CriarMesa(
        @NotNull UUID id,
        @NotNull UUID unidadeId,
        @NotBlank @Size(max = 80) String nome) {}
