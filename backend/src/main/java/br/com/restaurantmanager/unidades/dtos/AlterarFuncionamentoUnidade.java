package br.com.restaurantmanager.unidades.dtos;

import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public record AlterarFuncionamentoUnidade(
        @NotNull @Min(0) Long versao,
        @NotNull @Min(0) Long versaoUnidade,
        @NotNull @Size(max = 3) List<@NotNull CanalAtendimento> canais,
        @NotNull @Size(max = 84) List<@NotNull @Valid HorarioUnidade> horarios) {}
