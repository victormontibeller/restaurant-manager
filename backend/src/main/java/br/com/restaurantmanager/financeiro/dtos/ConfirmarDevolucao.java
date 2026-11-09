package br.com.restaurantmanager.financeiro.dtos;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record ConfirmarDevolucao(@NotNull UUID intencaoId) {}
