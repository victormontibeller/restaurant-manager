package br.com.restaurantmanager.pedidos.models;

import br.com.restaurantmanager.carrinho.dtos.SnapshotLinha;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/** Estado interno imutável lido sob lock pelo serviço do agregado. */
public record PedidoRegistro(UUID id, UUID unidadeId, UUID comandaId, UUID usuarioId,
        UUID participanteId, String autoria, CanalAtendimento canal, EstadoPedido estado,
        long versao, Instant criadoEm, Instant primeiroPreparoEm, Instant alertarEm,
        Instant expirarEm, boolean alertado, String observacao, List<SnapshotLinha> linhas,
        String payload) {}
