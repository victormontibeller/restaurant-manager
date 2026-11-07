package br.com.restaurantmanager.catalogo.dtos;

import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.util.List;
import java.util.UUID;

public record Oferta(
        UUID produtoId,
        UUID unidadeId,
        long versao,
        String preco,
        boolean disponivel,
        List<CanalAtendimento> canais) {}
