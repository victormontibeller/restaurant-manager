package br.com.restaurantmanager.comunicacoes.dtos;

import java.util.UUID;

public record TrabalhoNotificacao(
        UUID id, UUID pedidoId, String tipo, UUID leaseId, String conteudo) {
    @Override
    public String toString() {
        return "TrabalhoNotificacao[PROTEGIDO]";
    }
}
