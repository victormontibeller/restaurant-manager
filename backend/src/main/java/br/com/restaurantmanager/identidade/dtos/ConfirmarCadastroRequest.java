package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ConfirmarCadastroRequest(
        @NotBlank @Pattern(regexp = "[A-Za-z0-9_-]{43}") String codigo,
        @NotBlank @Size(min = 12, max = 72) String senha) {
    @Override
    public String toString() {
        return "ConfirmacaoCadastro[protegida]";
    }
}
