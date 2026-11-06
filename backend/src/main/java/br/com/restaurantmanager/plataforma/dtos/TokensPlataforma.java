package br.com.restaurantmanager.plataforma.dtos;

public record TokensPlataforma(
        String accessToken,
        String refreshToken,
        long expiresIn) {
    @Override
    public String toString() {
        return "TokensPlataforma[protegidos]";
    }
}
