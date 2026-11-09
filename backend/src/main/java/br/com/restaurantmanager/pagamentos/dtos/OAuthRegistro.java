package br.com.restaurantmanager.pagamentos.dtos;

import java.time.Instant;
import java.util.UUID;

public record OAuthRegistro(
        UUID id,
        String verificador,
        String retorno,
        UUID atorId,
        UUID sessaoId,
        Instant expiraEm,
        String estado) {
    @Override
    public String toString() {
        return "OAuthRegistro[PROTEGIDO]";
    }
}
