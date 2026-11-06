package br.com.restaurantmanager.identidade.dtos;

public record CsrfResponse(
        String token,
        String headerName) {}
