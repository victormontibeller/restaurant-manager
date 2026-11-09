package br.com.restaurantmanager.financeiro.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record EntradaAjuste(
        @NotNull UUID intencaoId,
        @NotNull @Size(min = 1, max = 500) String motivo,
        @NotNull @Size(min = 1, max = 100) List<@NotNull @Valid AlocacaoAjuste> alocacoes) {}
