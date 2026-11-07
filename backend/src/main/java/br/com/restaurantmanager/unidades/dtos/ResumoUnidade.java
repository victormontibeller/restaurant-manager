package br.com.restaurantmanager.unidades.dtos;

import java.util.UUID;

public record ResumoUnidade(
        UUID id,
        String nome,
        String fuso) {}
