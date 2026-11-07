package br.com.restaurantmanager.plataforma.dtos;

import java.time.Instant;
import java.util.UUID;

public record SessaoPlataforma(
        UUID id,
        UUID usuario,
        Instant expira,
        Instant revogada,
        Instant reautenticada) {
    public boolean valida(Instant agora) {
        return revogada == null && expira.isAfter(agora);
    }
}
