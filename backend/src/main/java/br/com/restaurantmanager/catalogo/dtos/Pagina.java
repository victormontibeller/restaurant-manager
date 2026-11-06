package br.com.restaurantmanager.catalogo.dtos;

import java.util.List;

public record Pagina<T>(List<T> itens, boolean temMais) {}
