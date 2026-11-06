package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SolicitarCadastroRequest(@NotBlank @Email @Size(max = 254) @Pattern(regexp = "[^\\s\\p{Cntrl}]+") String email) {
    @Override
    public String toString() {
        return "SolicitacaoCadastro[protegida]";
    }
}
