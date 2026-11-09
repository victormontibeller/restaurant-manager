package br.com.restaurantmanager.financeiro.dtos;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record AlocacaoAjuste(@NotNull UUID parcelaId, @NotNull String valor) {}
