package br.com.restaurantmanager.pagamentos.dtos;

import java.time.Instant;
import java.util.UUID;

public record ConexaoRegistro(
        UUID id,
        String vendedor,
        String credencial,
        Instant expiraEm,
        boolean reautorizar,
        long versao,
        UUID leaseId,
        Instant leaseAte) {
    @Override
    public String toString() {
        return "ConexaoRegistro[PROTEGIDA]";
    }
}
