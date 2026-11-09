package br.com.restaurantmanager.pagamentos.dtos;

import java.time.Instant;

public record CredencialPagamento(
        String accessToken, String refreshToken, String vendedor, Instant expiraEm) {
    @Override
    public String toString() {
        return "CredencialPagamento[PROTEGIDA]";
    }
}
