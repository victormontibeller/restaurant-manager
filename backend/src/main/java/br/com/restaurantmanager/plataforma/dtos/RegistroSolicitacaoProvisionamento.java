package br.com.restaurantmanager.plataforma.dtos;

import java.util.UUID;

public record RegistroSolicitacaoProvisionamento(
        UUID id,
        UUID operador,
        String nome,
        String host,
        String unidade,
        String email,
        String hash,
        String estado,
        long versao,
        String falha) {
    @Override
    public String toString() {
        return "SolicitacaoProvisionamento[" + id + "," + estado + "]";
    }
}
