package br.com.restaurantmanager.relatorios.dtos;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record RelatorioVendas(
        UUID unidadeId,
        LocalDate inicio,
        LocalDate fim,
        String fuso,
        Instant consultadoEm,
        long pedidosCriados,
        long canceladosAtualmente,
        String cobrancasOriginais,
        String ajustesNoPeriodo,
        String recebimentosConfirmados,
        String devolucoesConfirmadas,
        String saldoAReceberAtual,
        String saldoADevolverAtual,
        String reservasAtuais) {}
