package br.com.restaurantmanager.mesas.dtos;

import java.util.UUID;

public record AberturaAtendimento(
        UUID atendimentoId,
        UUID comandaId,
        UUID mesaId,
        UUID unidadeId,
        String codigoTemporario,
        long versao) {
    @Override
    public String toString() {
        return "AberturaAtendimento[protegido]";
    }
}
