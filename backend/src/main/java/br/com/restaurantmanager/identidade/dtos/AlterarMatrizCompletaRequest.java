package br.com.restaurantmanager.identidade.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.Set;

public record AlterarMatrizCompletaRequest(
        @NotNull @Min(0) Long versao,
        @NotNull Map<String, @NotNull @Size(max = 80) Set<@NotBlank String>> perfis) {}
