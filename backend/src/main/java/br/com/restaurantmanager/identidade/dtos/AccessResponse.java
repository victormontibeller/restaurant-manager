package br.com.restaurantmanager.identidade.dtos;

public record AccessResponse(
        String accessToken,
        long expiresIn) {
    @Override
    public String toString() {
        return "Access[protegido]";
    }
}
