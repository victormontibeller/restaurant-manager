package br.com.restaurantmanager.pedidos.dtos;

import br.com.restaurantmanager.carrinho.dtos.SnapshotLinha;
import br.com.restaurantmanager.financeiro.dtos.SaldoCobranca;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record PedidoDetalhe(UUID id, UUID unidadeId, UUID comandaId, CanalAtendimento canal,
        EstadoPedido estado, long versao, Instant criadoEm, Instant primeiroPreparoEm,
        Instant alertarEm, Instant expirarEm, String observacao, List<SnapshotLinha> linhas,
        List<UnidadeProducao> unidades, List<HistoricoPedido> historico,
        List<SolicitacaoCancelamento> solicitacoes, SaldoCobranca saldo) {}
