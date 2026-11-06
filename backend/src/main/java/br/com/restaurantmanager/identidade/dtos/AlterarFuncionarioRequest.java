package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;
import java.util.UUID;

public record AlterarFuncionarioRequest(
        @Min(0) long versao,
        @NotBlank String perfil,
        @NotNull Boolean ativo,
        @NotNull @Size(max = 100) Set<@NotNull UUID> unidades) {}
