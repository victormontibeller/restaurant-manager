package br.com.restaurantmanager.midia.dtos;

import java.util.UUID;

public record MidiaResumo(
        UUID id,
        String url,
        String contentType,
        int largura,
        int altura,
        int tamanho,
        String sha256) {
    public static MidiaResumo criar(UUID id, String tipo, int largura, int altura, int tamanho, String sha256) {
        return new MidiaResumo(id, "/api/v1/midias/" + id, tipo, largura, altura, tamanho, sha256);
    }
}
