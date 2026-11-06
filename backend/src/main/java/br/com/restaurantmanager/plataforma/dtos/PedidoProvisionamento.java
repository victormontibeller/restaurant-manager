package br.com.restaurantmanager.plataforma.dtos;

import java.util.UUID;

public record PedidoProvisionamento(
        UUID id,
        String nome,
        String host,
        String unidade,
        String email,
        String senha) {
    @Override
    public String toString() {
        return "PedidoProvisionamento[" + id + "]";
    }
}
