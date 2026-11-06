package br.com.restaurantmanager.catalogo.dtos;

import java.util.Map;
import java.util.UUID;

public record ContextoCarrinho(Map<UUID, ProdutoPublico> produtos, boolean aberto, String revisao) {}
