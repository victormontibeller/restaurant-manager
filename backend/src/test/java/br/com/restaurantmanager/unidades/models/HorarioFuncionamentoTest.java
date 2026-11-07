package br.com.restaurantmanager.unidades.models;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import java.time.Instant;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class HorarioFuncionamentoTest {
    @Test
    void respeitaFusoInicioInclusivoEFimExclusivo() {
        var horario = horario(1, "10:00", "12:00");
        var saoPaulo = ZoneId.of("America/Sao_Paulo");

        assertThat(horario.contem(Instant.parse("2026-11-09T12:59:59Z"), saoPaulo)).isFalse();
        assertThat(horario.contem(Instant.parse("2026-11-09T13:00:00Z"), saoPaulo)).isTrue();
        assertThat(horario.contem(Instant.parse("2026-11-09T14:59:59Z"), saoPaulo)).isTrue();
        assertThat(horario.contem(Instant.parse("2026-11-09T15:00:00Z"), saoPaulo)).isFalse();
        assertThat(horario.contem(Instant.parse("2026-11-09T13:00:00Z"), ZoneId.of("UTC"))).isFalse();
    }

    @Test
    void horarioNoturnoIncluiDiaSeguinteEViradaDaSemana() {
        var sexta = horario(5, "18:00", "02:00");
        var domingo = horario(7, "22:00", "02:00");
        var utc = ZoneId.of("UTC");

        assertThat(sexta.fimMinuto()).isEqualTo(26 * 60);
        assertThat(sexta.fim()).isEqualTo("02:00");
        assertThat(sexta.contem(Instant.parse("2026-11-07T01:59:59Z"), utc)).isTrue();
        assertThat(sexta.contem(Instant.parse("2026-11-07T02:00:00Z"), utc)).isFalse();
        assertThat(domingo.contem(Instant.parse("2026-11-09T01:59:59Z"), utc)).isTrue();
        assertThat(domingo.contem(Instant.parse("2026-11-09T02:00:00Z"), utc)).isFalse();
        assertThat(domingo.contem(Instant.parse("2026-11-10T01:00:00Z"), utc)).isFalse();
    }

    @Test
    void permiteDiaInteiroEFimEmMeiaNoiteSemCriarDiaSeguinte() {
        var inteiro = horario(1, "00:00", "24:00");
        var ateMeiaNoite = horario(1, "18:00", "00:00");
        var utc = ZoneId.of("UTC");

        assertThat(inteiro.contem(Instant.parse("2026-11-09T00:00:00Z"), utc)).isTrue();
        assertThat(inteiro.contem(Instant.parse("2026-11-09T23:59:59Z"), utc)).isTrue();
        assertThat(inteiro.contem(Instant.parse("2026-11-10T00:00:00Z"), utc)).isFalse();
        assertThat(ateMeiaNoite.fim()).isEqualTo("24:00");
        assertThat(ateMeiaNoite.contem(Instant.parse("2026-11-10T00:00:00Z"), utc)).isFalse();
    }

    @Test
    void repeteHorarioLocalNasDuasOcorrenciasDeMudancaDeFuso() {
        var horario = horario(7, "01:00", "02:00");
        var novaYork = ZoneId.of("America/New_York");

        assertThat(horario.contem(Instant.parse("2026-11-01T05:30:00Z"), novaYork)).isTrue();
        assertThat(horario.contem(Instant.parse("2026-11-01T06:30:00Z"), novaYork)).isTrue();
        assertThat(horario.contem(Instant.parse("2026-11-01T07:00:00Z"), novaYork)).isFalse();
    }

    @Test
    void rejeitaHorarioMalformadoVazioEDiaForaDoIntervalo() {
        for (String inicio : List.of("", "1:00", "24:00", "10:60", "-1:00", " 10:00", "10:00:00")) {
            assertThatThrownBy(() -> horario(1, inicio, "12:00")).isInstanceOf(AuthFailure.class);
        }
        for (String fim : List.of("", "24:01", "25:00", "12:60", "12:00 ")) {
            assertThatThrownBy(() -> horario(1, "10:00", fim)).isInstanceOf(AuthFailure.class);
        }
        assertThatThrownBy(() -> horario(1, "10:00", "10:00")).isInstanceOf(AuthFailure.class);
        assertThatThrownBy(() -> horario(0, "10:00", "12:00")).isInstanceOf(AuthFailure.class);
        assertThatThrownBy(() -> horario(8, "10:00", "12:00")).isInstanceOf(AuthFailure.class);
        assertThatThrownBy(() -> horario(1, null, "12:00")).isInstanceOf(AuthFailure.class);
    }

    @Test
    void rejeitaSobreposicaoInclusaoDuplicacaoEDomingoComSegunda() {
        for (List<HorarioFuncionamento> janelas : List.of(
                List.of(horario(1, "10:00", "12:00"), horario(1, "11:00", "13:00")),
                List.of(horario(1, "10:00", "14:00"), horario(1, "11:00", "12:00")),
                List.of(horario(1, "10:00", "12:00"), horario(1, "10:00", "12:00")),
                List.of(horario(1, "22:00", "02:00"), horario(2, "01:00", "03:00")),
                List.of(horario(7, "22:00", "02:00"), horario(1, "01:00", "03:00")))) {
            assertThatThrownBy(() -> HorarioFuncionamento.validarSemSobreposicao(janelas))
                    .isInstanceOf(AuthFailure.class);
        }
    }

    @Test
    void permiteJanelasAdjacentesECanaisDiferentes() {
        var janelas = List.of(horario(1, "10:00", "12:00"), horario(1, "12:00", "14:00"),
                horario(7, "22:00", "02:00"), horario(1, "02:00", "04:00"),
                HorarioFuncionamento.criar(CanalAtendimento.MESA, 1, "10:00", "14:00"));
        HorarioFuncionamento.validarSemSobreposicao(janelas);
    }

    @Test
    void normalizaOrdemSemPerderHorariosDosCanaisDesabilitados() {
        var primeira = new FuncionamentoUnidade(0, List.of(CanalAtendimento.MESA, CanalAtendimento.DELIVERY),
                List.of(horario(2, "10:00", "12:00"), horario(1, "10:00", "12:00")));
        var segunda = new FuncionamentoUnidade(9, List.of(CanalAtendimento.DELIVERY, CanalAtendimento.MESA),
                List.of(horario(1, "10:00", "12:00"), horario(2, "10:00", "12:00")));
        var desabilitada = new FuncionamentoUnidade(0, List.of(), primeira.horarios());

        assertThat(primeira.mesmoConteudo(segunda)).isTrue();
        assertThat(desabilitada.habilitado(CanalAtendimento.DELIVERY)).isFalse();
        assertThat(desabilitada.horarios()).hasSize(2);
    }

    @Test
    void limitaQuantidadeTotalENaoAceitaCanaisRepetidos() {
        var janelas = new ArrayList<HorarioFuncionamento>();
        for (CanalAtendimento canal : CanalAtendimento.values()) {
            for (int dia = 1; dia <= 7; dia++) {
                for (int bloco = 0; bloco < 4; bloco++) {
                    janelas.add(new HorarioFuncionamento(canal, dia, bloco * 120, bloco * 120 + 60));
                }
            }
        }
        assertThat(new FuncionamentoUnidade(0, List.of(), janelas).horarios()).hasSize(84);

        janelas.add(horario(1, "20:00", "21:00"));
        assertThatThrownBy(() -> new FuncionamentoUnidade(0, List.of(), janelas))
                .isInstanceOf(AuthFailure.class);
        assertThatThrownBy(() -> new FuncionamentoUnidade(0,
                List.of(CanalAtendimento.DELIVERY, CanalAtendimento.DELIVERY), List.of()))
                .isInstanceOf(AuthFailure.class);
    }

    private HorarioFuncionamento horario(int dia, String inicio, String fim) {
        return HorarioFuncionamento.criar(CanalAtendimento.DELIVERY, dia, inicio, fim);
    }
}
