package br.com.restaurantmanager.mesas.dtos;

import java.time.Instant;
import java.util.UUID;

public record CodigoAtendimento(
        UUID atendimentoId,
        UUID comandaId,
        UUID unidadeId,
        String codigoHash,
        Instant expiraEm) {
    @Override
    public String toString() {
        return "CodigoAtendimento[protegido]";
    }
}
