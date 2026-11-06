package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ConfirmarVerificacaoRequest(@NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String codigo) {
    @Override
    public String toString() {
        return "ConfirmacaoVerificacao[protegida]";
    }
}
