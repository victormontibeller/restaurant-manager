package br.com.restaurantmanager.catalogo.dtos;

import java.util.List;
import java.util.UUID;

public record Favoritos(List<UUID> produtoIds) {}
