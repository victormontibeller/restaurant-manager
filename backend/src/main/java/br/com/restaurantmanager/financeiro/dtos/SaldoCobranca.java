package br.com.restaurantmanager.financeiro.dtos;

import java.math.BigDecimal;

public record SaldoCobranca(String totalDevido, String pagoConfirmado, String devolvidoConfirmado,
        String saldoAReceber, String saldoADevolver, boolean pendenciaFinanceira) {
    public boolean podeFechar() {
        return new BigDecimal(saldoAReceber).signum() == 0
                && new BigDecimal(saldoADevolver).signum() == 0 && !pendenciaFinanceira;
    }

    public boolean recebeu() {
        return new BigDecimal(pagoConfirmado).signum() > 0;
    }
}
