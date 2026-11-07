package br.com.restaurantmanager.carrinho.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record Linha(
        @NotNull UUID id,
        @NotNull UUID produtoId,
        @NotNull @Min(1) @Max(99) Integer quantidade,
        @NotNull @Size(max = 20) List<@NotNull @Valid SelecaoAdicional> adicionais,
        @NotNull @Size(max = 200) List<@NotNull @Valid Escolha> escolhas) {}
