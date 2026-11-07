package br.com.restaurantmanager.unidades.dtos;

import java.util.List;

public record PaginaEventosUnidade(
        UnidadeAtualEventos unidade,
        List<EventoUnidadeResposta> eventos,
        String proximo,
        boolean temMais) {}
