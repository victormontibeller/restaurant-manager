package br.com.restaurantmanager.pagamentos.dtos;

import java.util.UUID;

public record CheckoutResumo(UUID id, String estado, String checkoutUrl, String ultimaFalha) {}
