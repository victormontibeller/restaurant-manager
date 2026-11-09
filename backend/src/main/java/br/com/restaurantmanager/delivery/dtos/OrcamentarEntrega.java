package br.com.restaurantmanager.delivery.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.util.UUID;

public record OrcamentarEntrega(
        @NotNull UUID unidadeId,
        @NotNull @Pattern(regexp = "[0-9]{8}") String cep,
        @NotNull String subtotal) {}
