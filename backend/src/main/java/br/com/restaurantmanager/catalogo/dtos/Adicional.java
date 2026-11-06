package br.com.restaurantmanager.catalogo.dtos;

import br.com.restaurantmanager.catalogo.converters.TextoMonetarioDeserializer;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import tools.jackson.databind.annotation.JsonDeserialize;

public record Adicional(
        @NotNull UUID id,
        @NotBlank @Size(max = 120) String nome,
        @NotNull @JsonDeserialize(using = TextoMonetarioDeserializer.class) String preco,
        @NotNull @Min(1) @Max(10) Integer maximo,
        @NotNull Boolean ativo) {}
