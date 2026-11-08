package br.com.restaurantmanager.financeiro.dtos;

import java.math.BigDecimal;
import java.util.UUID;

/** Contrato financeiro independente da estrutura interna dos pedidos. */
public record ParcelaInicial(UUID unidadeComercialId, BigDecimal valor) {}
