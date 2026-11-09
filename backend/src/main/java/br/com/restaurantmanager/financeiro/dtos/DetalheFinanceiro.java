package br.com.restaurantmanager.financeiro.dtos;

import java.util.List;
import java.util.UUID;

public record DetalheFinanceiro(
        UUID cobrancaId,
        SaldoCobranca saldo,
        String reservado,
        List<ParcelaCobranca> parcelas,
        List<Recebimento> recebimentos,
        List<Devolucao> devolucoes) {}
