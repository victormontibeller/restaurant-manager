package br.com.restaurantmanager.plataforma.dtos;

import java.util.UUID;

public record ResultadoProvisionamento(
        UUID id,
        String schema,
        String estado) {}
