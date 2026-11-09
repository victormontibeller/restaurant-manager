package br.com.restaurantmanager.financeiro.dtos;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record EntradaRecebimento(
        @NotNull UUID intencaoId, @NotNull String metodo, @NotNull String valor, String entregue) {}
