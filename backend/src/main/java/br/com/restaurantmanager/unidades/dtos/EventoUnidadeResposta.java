package br.com.restaurantmanager.unidades.dtos;

import java.time.Instant;

public record EventoUnidadeResposta(
        String versao,
        String tipo,
        String nome,
        String fuso,
        boolean ativa,
        Instant ocorridoEm) {}
