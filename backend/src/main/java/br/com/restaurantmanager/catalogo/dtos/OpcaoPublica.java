package br.com.restaurantmanager.catalogo.dtos;

import java.util.List;
import java.util.UUID;

public record OpcaoPublica(
        UUID id,
        UUID produtoId,
        String nome,
        String acrescimo,
        int limite,
        List<UUID> adicionaisPermitidos,
        boolean disponivel,
        List<Adicional> adicionais) {}
