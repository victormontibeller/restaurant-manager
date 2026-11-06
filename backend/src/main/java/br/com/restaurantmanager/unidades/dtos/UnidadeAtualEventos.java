package br.com.restaurantmanager.unidades.dtos;

import java.util.UUID;

public record UnidadeAtualEventos(
        UUID id,
        String nome,
        String fuso,
        String versao) {}
