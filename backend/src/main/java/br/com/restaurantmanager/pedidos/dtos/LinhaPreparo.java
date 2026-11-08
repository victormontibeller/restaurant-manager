package br.com.restaurantmanager.pedidos.dtos;

import java.util.List;
import java.util.UUID;

public record LinhaPreparo(UUID id, String nome, String tipo, int quantidade,
        List<AdicionalPreparo> adicionais, List<EscolhaPreparo> escolhas) {}
