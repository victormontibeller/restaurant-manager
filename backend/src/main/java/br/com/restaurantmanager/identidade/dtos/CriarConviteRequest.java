package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;

public record CriarConviteRequest(
        @NotNull UUID id,
        @NotBlank @Email @Size(max = 254) @Pattern(regexp = "[^\\s\\p{Cntrl}]+") String email,
        @NotBlank @Size(max = 20) String perfil,
        @NotNull @Size(max = 100) Set<@NotNull UUID> unidades) {
    @Override
    public String toString() {
        return "CriarConvite[protegido]";
    }
}
