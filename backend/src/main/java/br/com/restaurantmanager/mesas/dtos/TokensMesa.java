package br.com.restaurantmanager.mesas.dtos;

public record TokensMesa(
        String accessToken,
        String refreshToken,
        long expiresIn) {
    @Override
    public String toString() {
        return "TokensMesa[protegidos]";
    }
}
