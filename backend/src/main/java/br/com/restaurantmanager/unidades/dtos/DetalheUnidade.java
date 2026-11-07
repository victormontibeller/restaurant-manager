package br.com.restaurantmanager.unidades.dtos;

import java.util.UUID;

public record DetalheUnidade(
        UUID id,
        String nome,
        String fuso,
        boolean ativa,
        long versao) {}
