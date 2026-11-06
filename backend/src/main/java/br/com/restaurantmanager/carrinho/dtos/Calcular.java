package br.com.restaurantmanager.carrinho.dtos;

import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record Calcular(
        @NotNull UUID unidadeId,
        @NotNull CanalAtendimento canal,
        @NotNull @Size(min = 1, max = 50) List<@NotNull @Valid Linha> linhas,
        @Pattern(regexp = "[a-f0-9]{64}") String revisaoAnterior) {}
