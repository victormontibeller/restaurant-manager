package br.com.restaurantmanager.eventos.dtos;

import java.util.List;

public record PaginaEventosOperacionais(List<EventoOperacionalResposta> eventos, String proximo, boolean temMais) {}
