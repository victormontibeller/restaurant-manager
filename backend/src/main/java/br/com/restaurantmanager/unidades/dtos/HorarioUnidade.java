package br.com.restaurantmanager.unidades.dtos;

import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

public record HorarioUnidade(
        @NotNull CanalAtendimento canal,
        @NotNull @Min(1) @Max(7) Integer diaSemana,
        @NotNull @Pattern(regexp = "(?:[01][0-9]|2[0-3]):[0-5][0-9]") String inicio,
        @NotNull @Pattern(regexp = "(?:(?:[01][0-9]|2[0-3]):[0-5][0-9]|24:00)") String fim) {}
