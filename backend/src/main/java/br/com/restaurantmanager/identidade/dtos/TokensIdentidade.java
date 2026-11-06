package br.com.restaurantmanager.identidade.dtos;

public record TokensIdentidade(
        String accessToken,
        String refreshToken,
        long expiresIn) {
    @Override
    public String toString() {
        return "Tokens[protegidos]";
    }
}
