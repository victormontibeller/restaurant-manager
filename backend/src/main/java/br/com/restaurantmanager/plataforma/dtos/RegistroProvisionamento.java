package br.com.restaurantmanager.plataforma.dtos;

import java.util.UUID;

public record RegistroProvisionamento(
        UUID id,
        String nome,
        String schema,
        String estado,
        String host,
        String unidade,
        String email,
        String hash) {
    @Override
    public String toString() {
        return "Provisionamento[" + id + "," + estado + "]";
    }
}
