package br.com.restaurantmanager.unidades.dtos;

import br.com.restaurantmanager.unidades.models.CanalAtendimento;

public record CanalPublicoUnidade(
        CanalAtendimento canal,
        boolean habilitado,
        boolean aberto) {}
