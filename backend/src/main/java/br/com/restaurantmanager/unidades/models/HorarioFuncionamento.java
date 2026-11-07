package br.com.restaurantmanager.unidades.models;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import java.time.Instant;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/** Intervalo semanal, fechado no início e aberto no fim, no fuso da unidade. */
public record HorarioFuncionamento(CanalAtendimento canal, int diaSemana, int inicioMinuto, int fimMinuto) {
    private static final int MINUTOS_DIA = 24 * 60;
    private static final int MINUTOS_SEMANA = 7 * MINUTOS_DIA;

    static final Comparator<HorarioFuncionamento> ORDEM = Comparator
            .comparing(HorarioFuncionamento::canal)
            .thenComparingInt(HorarioFuncionamento::diaSemana)
            .thenComparingInt(HorarioFuncionamento::inicioMinuto)
            .thenComparingInt(HorarioFuncionamento::fimMinuto);

    public static HorarioFuncionamento criar(CanalAtendimento canal, Integer dia, String inicio, String fim) {
        if (canal == null || dia == null || dia < 1 || dia > 7) {
            throw invalido("Informe um canal válido e dia da semana entre 1 e 7.");
        }

        int primeiro = minuto(inicio, false);
        int ultimo = minuto(fim, true);
        if (primeiro == ultimo) {
            throw invalido("O início e o fim do horário devem ser diferentes. Para o dia inteiro, use 00:00 a 24:00.");
        }
        if (ultimo < primeiro) {
            ultimo += MINUTOS_DIA;
        }
        return new HorarioFuncionamento(canal, dia, primeiro, ultimo);
    }

    static void validarSemSobreposicao(List<HorarioFuncionamento> horarios) {
        for (int i = 0; i < horarios.size(); i++) {
            var atual = horarios.get(i);
            for (int j = i + 1; j < horarios.size(); j++) {
                var outro = horarios.get(j);
                if (atual.canal != outro.canal) {
                    continue;
                }
                // Deslocamentos incluem a janela de domingo que termina na segunda.
                for (int deslocamento = -MINUTOS_SEMANA; deslocamento <= MINUTOS_SEMANA;
                        deslocamento += MINUTOS_SEMANA) {
                    if (atual.inicioSemanal() < outro.fimSemanal() + deslocamento
                            && outro.inicioSemanal() + deslocamento < atual.fimSemanal()) {
                        throw invalido("Os horários do mesmo canal não podem se sobrepor, inclusive na virada do dia.");
                    }
                }
            }
        }
    }

    public boolean contem(Instant instante, ZoneId fuso) {
        var local = instante.atZone(fuso);
        int minuto = (local.getDayOfWeek().getValue() - 1) * MINUTOS_DIA
                + local.getHour() * 60 + local.getMinute();
        return entre(minuto) || entre(minuto + MINUTOS_SEMANA);
    }

    public String inicio() {
        return formatar(inicioMinuto);
    }

    public String fim() {
        return formatar(fimMinuto > MINUTOS_DIA ? fimMinuto - MINUTOS_DIA : fimMinuto);
    }

    private boolean entre(int minuto) {
        return minuto >= inicioSemanal() && minuto < fimSemanal();
    }

    private int inicioSemanal() {
        return (diaSemana - 1) * MINUTOS_DIA + inicioMinuto;
    }

    private int fimSemanal() {
        return (diaSemana - 1) * MINUTOS_DIA + fimMinuto;
    }

    private static int minuto(String horario, boolean permiteFimDoDia) {
        if (permiteFimDoDia && "24:00".equals(horario)) {
            return MINUTOS_DIA;
        }
        if (horario == null || !horario.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]")) {
            throw invalido("Informe o horário no formato HH:mm; 24:00 é permitido somente no fim.");
        }
        return Integer.parseInt(horario.substring(0, 2)) * 60
                + Integer.parseInt(horario.substring(3, 5));
    }

    private static String formatar(int minuto) {
        return String.format(Locale.ROOT, "%02d:%02d", minuto / 60, minuto % 60);
    }

    private static AuthFailure invalido(String mensagem) {
        return new AuthFailure(422, "HORARIO_INVALIDO", mensagem);
    }
}
