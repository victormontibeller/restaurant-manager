package br.com.restaurantmanager.shared;

import java.util.UUID;

public record ApiError(String codigo, String mensagem, String correlacao) {
    public static ApiError of(String codigo, String mensagem) {
        return new ApiError(codigo, mensagem, UUID.randomUUID().toString());
    }
}
