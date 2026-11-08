package br.com.restaurantmanager.pedidos.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record ComandoPedido(
        @NotNull UUID intencaoId,
        @Min(0) long versao,
        @Size(max = 500) String motivo,
        @NotNull @Size(max = 4950) List<@NotNull UUID> unidades) {}
