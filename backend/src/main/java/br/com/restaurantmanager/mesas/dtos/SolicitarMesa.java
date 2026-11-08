package br.com.restaurantmanager.mesas.dtos;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.util.UUID;

public record SolicitarMesa(@NotNull UUID intencaoId, @NotNull @Pattern(regexp = "AJUDA|CONTA") String tipo) {}
