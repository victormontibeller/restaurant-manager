package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Set;

public record AlterarMatrizRequest(
        @Min(0) long versao,
        @NotBlank String perfil,
        @NotNull @Size(max = 80) Set<@NotBlank String> acoes) {}
