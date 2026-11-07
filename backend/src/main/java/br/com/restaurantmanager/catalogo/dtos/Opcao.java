package br.com.restaurantmanager.catalogo.dtos;

import br.com.restaurantmanager.catalogo.converters.TextoMonetarioDeserializer;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import tools.jackson.databind.annotation.JsonDeserialize;

public record Opcao(
        @NotNull UUID id,
        @NotNull UUID produtoId,
        @NotNull @JsonDeserialize(using = TextoMonetarioDeserializer.class) String acrescimo,
        @NotNull @Min(1) @Max(20) Integer limite,
        @NotNull @Size(max = 20) List<@NotNull UUID> adicionaisPermitidos) {}
