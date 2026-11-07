package br.com.restaurantmanager.identidade.dtos;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record ConviteResumo(
        UUID id,
        String email,
        String perfil,
        List<UUID> unidades,
        String estado,
        Instant expiraEm) {}
