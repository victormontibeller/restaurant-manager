package br.com.restaurantmanager.financeiro.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record EntradaDevolucao(
        @NotNull UUID intencaoId,
        @NotNull UUID recebimentoId,
        @NotNull String valor,
        @NotNull @Size(min = 1, max = 500) String motivo) {}
