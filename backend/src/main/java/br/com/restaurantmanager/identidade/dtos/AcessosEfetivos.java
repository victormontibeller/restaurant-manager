package br.com.restaurantmanager.identidade.dtos;

import java.util.List;

public record AcessosEfetivos(
        String perfil,
        long versaoPolitica,
        List<String> acoes,
        List<UnidadePermitida> unidades) {}
