package br.com.restaurantmanager.mesas.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record VersaoComanda(@NotNull @Min(0) Long versao) {}
