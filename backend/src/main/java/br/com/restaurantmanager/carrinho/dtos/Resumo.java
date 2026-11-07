package br.com.restaurantmanager.carrinho.dtos;

import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.util.List;
import java.util.UUID;

public record Resumo(
        UUID unidadeId,
        CanalAtendimento canal,
        String moeda,
        String revisao,
        boolean requerConfirmacao,
        List<SnapshotLinha> linhas,
        String subtotal,
        String total) {}
