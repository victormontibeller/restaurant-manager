package br.com.restaurantmanager.mesas.dtos;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record IntencaoAtendimento(@NotNull UUID intencaoId) {}
