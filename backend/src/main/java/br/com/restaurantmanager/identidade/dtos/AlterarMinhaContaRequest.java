package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record AlterarMinhaContaRequest(
        @NotNull @Min(0) Long versao,
        @Size(max = 120) String nome,
        @Size(max = 32) String telefone) {}
