package br.com.restaurantmanager.catalogo.dtos;

import java.util.List;
import java.util.UUID;

public record GrupoPublico(
        UUID id,
        String nome,
        int minimo,
        int maximo,
        List<OpcaoPublica> opcoes) {}
