package br.com.restaurantmanager.carrinho.dtos;

import java.util.UUID;

public record SnapshotAdicional(
        UUID adicionalId,
        String nome,
        int quantidade,
        String precoUnitario,
        String total) {}
