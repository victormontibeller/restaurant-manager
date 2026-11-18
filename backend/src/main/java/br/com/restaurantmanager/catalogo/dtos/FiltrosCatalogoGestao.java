package br.com.restaurantmanager.catalogo.dtos;

import br.com.restaurantmanager.catalogo.models.TipoProduto;
import java.util.UUID;

public record FiltrosCatalogoGestao(String busca, UUID categoriaId, TipoProduto tipo, Boolean ativo,
        Boolean disponivel) {}
