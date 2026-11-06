package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SolicitarRecuperacaoRequest(@NotBlank @Email @Size(max = 254) String email) {
    @Override
    public String toString() {
        return "Solicitacao[protegida]";
    }
}
