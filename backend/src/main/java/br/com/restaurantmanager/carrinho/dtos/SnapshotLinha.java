package br.com.restaurantmanager.carrinho.dtos;

import br.com.restaurantmanager.catalogo.models.TipoProduto;
import java.util.List;
import java.util.UUID;

public record SnapshotLinha(
        UUID id,
        UUID produtoId,
        String nome,
        TipoProduto tipo,
        int quantidade,
        String precoBase,
        String precoUnitario,
        String subtotal,
        List<SnapshotAdicional> adicionais,
        List<SnapshotEscolha> escolhas) {}
