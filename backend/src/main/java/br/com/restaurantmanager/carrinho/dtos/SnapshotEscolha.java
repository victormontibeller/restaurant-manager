package br.com.restaurantmanager.carrinho.dtos;

import java.util.List;
import java.util.UUID;

public record SnapshotEscolha(
        UUID grupoId,
        String grupo,
        UUID opcaoId,
        UUID produtoId,
        String nome,
        int quantidade,
        String acrescimo,
        List<SnapshotAdicional> adicionais,
        String total) {}
