package br.com.restaurantmanager.unidades.dtos;

import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.util.List;
import java.util.UUID;

public record DetalheFuncionamentoUnidade(
        UUID unidadeId,
        long versao,
        String fuso,
        long versaoUnidade,
        List<CanalAtendimento> canais,
        List<HorarioUnidade> horarios) {}
