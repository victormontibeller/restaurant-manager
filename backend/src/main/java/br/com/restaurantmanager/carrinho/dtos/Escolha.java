package br.com.restaurantmanager.carrinho.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record Escolha(
        @NotNull UUID grupoId,
        @NotNull UUID opcaoId,
        @NotNull @Min(1) @Max(20) Integer quantidade,
        @NotNull @Size(max = 20) List<@NotNull @Valid SelecaoAdicional> adicionais) {}
