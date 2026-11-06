package br.com.restaurantmanager.unidades;

import br.com.restaurantmanager.identidade.AuthFailure;
import java.util.List;

record FuncionamentoUnidade(long versao, List<CanalAtendimento> canais, List<HorarioFuncionamento> horarios) {
    FuncionamentoUnidade {
        if (versao < 0 || canais == null || horarios == null) {
            throw invalido("Informe versão, canais e horários válidos.");
        }
        if (canais.size() > CanalAtendimento.values().length || canais.stream().anyMatch(c -> c == null)
                || canais.stream().distinct().count() != canais.size()) {
            throw invalido("Informe cada canal habilitado uma única vez.");
        }
        if (horarios.size() > 84 || horarios.stream().anyMatch(h -> h == null)) {
            throw invalido("Informe no máximo 84 horários válidos por unidade.");
        }

        canais = canais.stream().sorted().toList();
        horarios = horarios.stream().sorted(HorarioFuncionamento.ORDEM).toList();
        HorarioFuncionamento.validarSemSobreposicao(horarios);
    }

    boolean mesmoConteudo(FuncionamentoUnidade outro) {
        return canais.equals(outro.canais) && horarios.equals(outro.horarios);
    }

    boolean habilitado(CanalAtendimento canal) {
        return canais.contains(canal);
    }

    private static AuthFailure invalido(String mensagem) {
        return new AuthFailure(400, "ENTRADA_INVALIDA", mensagem);
    }
}
