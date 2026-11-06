package br.com.restaurantmanager.plataforma.dtos;

import java.util.UUID;

public record UsuarioPlataforma(
        UUID id,
        String hash,
        boolean ativo) {
    @Override
    public String toString() {
        return "UsuarioPlataforma[protegido]";
    }
}
