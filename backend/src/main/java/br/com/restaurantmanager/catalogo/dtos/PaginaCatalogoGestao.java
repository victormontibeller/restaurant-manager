package br.com.restaurantmanager.catalogo.dtos;

import java.util.List;
import java.util.Map;
import java.util.UUID;

public record PaginaCatalogoGestao(
        List<ItemCatalogoGestao> itens,
        boolean temMais,
        List<Categoria> categorias,
        Map<UUID, ComponenteCatalogoGestao> componentes) {}
