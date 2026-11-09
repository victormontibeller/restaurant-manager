package br.com.restaurantmanager.pagamentos.dtos;

import java.util.List;

public record SituacaoProvedor(
        String id,
        String vendedor,
        String referencia,
        String moeda,
        String valor,
        String checkoutUrl,
        String estado,
        List<PagamentoProvedor> pagamentos,
        List<ReembolsoProvedor> reembolsos) {}
