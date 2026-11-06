package br.com.restaurantmanager.unidades.dtos;

import br.com.restaurantmanager.unidades.models.FuncionamentoUnidade;
import java.util.UUID;

public record ConsultaFuncionamentoUnidade(
        UUID unidadeId,
        String nome,
        String fuso,
        boolean ativa,
        long versaoUnidade,
        FuncionamentoUnidade funcionamento) {}
