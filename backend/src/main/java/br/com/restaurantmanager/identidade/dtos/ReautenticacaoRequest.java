package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReautenticacaoRequest(@NotBlank @Size(max = 72) String senha) {
    @Override
    public String toString() {
        return "Confirmacao[protegida]";
    }
}
