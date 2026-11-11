package br.com.restaurantmanager.cozinha.dtos;

import java.time.Instant;

public record PainelCozinha(Instant consultadoEm, String fuso, GrupoCozinha fila,
        GrupoCozinha emPreparo, GrupoCozinha prontos, GrupoCozinha anteriores) {}
