package br.com.restaurantmanager.cozinha.dtos;

import java.util.List;

public record GrupoCozinha(List<CartaoCozinha> itens, long total, boolean mais) {}
