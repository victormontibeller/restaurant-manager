package br.com.restaurantmanager.delivery.dtos;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record ComandoOcorrencia(
        @NotNull UUID intencaoId,
        @Min(0) long versao,
        @NotBlank @Size(max = 500) String motivo,
        String decisao,
        Boolean devolverTaxa) {}
