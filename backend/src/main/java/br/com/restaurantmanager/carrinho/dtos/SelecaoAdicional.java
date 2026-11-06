package br.com.restaurantmanager.carrinho.dtos;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record SelecaoAdicional(@NotNull UUID adicionalId, @NotNull @Min(1) @Max(10) Integer quantidade) {}
