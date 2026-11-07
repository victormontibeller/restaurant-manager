package br.com.restaurantmanager.catalogo.dtos;

import br.com.restaurantmanager.catalogo.converters.TextoMonetarioDeserializer;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import tools.jackson.databind.annotation.JsonDeserialize;

public record AlterarOferta(
        @NotNull @Min(0) Long versao,
        @NotNull @JsonDeserialize(using = TextoMonetarioDeserializer.class) String preco,
        @NotNull Boolean disponivel,
        @NotNull @Size(max = 3) List<@NotNull CanalAtendimento> canais) {}
