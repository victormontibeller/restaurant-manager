package br.com.restaurantmanager.identidade.dtos;

import java.util.UUID;

public record EntregaEmail(
        UUID id,
        UUID lease,
        String conteudo) {
    @Override
    public String toString() {
        return "Entrega[protegida]";
    }
}
