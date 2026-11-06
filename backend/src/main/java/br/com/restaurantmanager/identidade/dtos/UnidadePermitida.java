package br.com.restaurantmanager.identidade.dtos;

import java.util.UUID;

public record UnidadePermitida(
        UUID id,
        String nome,
        String fuso) {}
