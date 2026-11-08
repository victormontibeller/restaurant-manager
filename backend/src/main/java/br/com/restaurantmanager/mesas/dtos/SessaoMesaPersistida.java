package br.com.restaurantmanager.mesas.dtos;

import java.time.Instant;
import java.util.UUID;

public record SessaoMesaPersistida(
        UUID sessaoId,
        UUID participanteId,
        UUID atendimentoId,
        UUID comandaId,
        UUID unidadeId,
        Instant expiraEm,
        Instant revogadaEm,
        String estadoComanda,
        Instant encerradoEm) {
    public boolean valida(Instant agora) {
        return revogadaEm == null && encerradoEm == null
                && !estadoComanda.equals("FECHADA") && agora.isBefore(expiraEm);
    }
}
