package br.com.restaurantmanager.delivery.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record RegiaoDelivery(
        @NotNull UUID id,
        @NotBlank @Size(max = 100) String nome,
        @NotNull @Pattern(regexp = "[0-9]{8}") String cepInicial,
        @NotNull @Pattern(regexp = "[0-9]{8}") String cepFinal,
        @NotNull String taxa,
        @NotNull String minimo,
        boolean ativa) {}
