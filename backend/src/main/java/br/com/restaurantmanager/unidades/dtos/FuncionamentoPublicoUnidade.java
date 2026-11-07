package br.com.restaurantmanager.unidades.dtos;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record FuncionamentoPublicoUnidade(
        UUID unidadeId,
        String nome,
        String fuso,
        Instant consultadoEm,
        List<CanalPublicoUnidade> canais,
        List<HorarioUnidade> horarios) {}
