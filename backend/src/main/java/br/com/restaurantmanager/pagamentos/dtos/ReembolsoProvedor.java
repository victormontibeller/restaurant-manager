package br.com.restaurantmanager.pagamentos.dtos;

public record ReembolsoProvedor(String id, String transacaoId, String valor, String estado) {}
