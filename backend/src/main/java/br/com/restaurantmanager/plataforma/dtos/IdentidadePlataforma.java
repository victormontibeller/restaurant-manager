package br.com.restaurantmanager.plataforma.dtos;

import java.util.UUID;

public record IdentidadePlataforma(
        UUID usuarioId,
        UUID sessaoId,
        String perfil) {}
