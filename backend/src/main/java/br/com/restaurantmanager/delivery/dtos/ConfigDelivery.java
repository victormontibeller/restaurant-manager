package br.com.restaurantmanager.delivery.dtos;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record ConfigDelivery(
        @Min(0) long versao,
        int checkoutSegundos,
        @NotNull @Size(max = 100) List<@NotNull @Valid RegiaoDelivery> regioes) {}
