package br.com.restaurantmanager.identidade.dtos;

public record DescricaoAcao(
        String codigo,
        String descricao,
        String escopo,
        String dependencia) {}
