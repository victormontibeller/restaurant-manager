package br.com.restaurantmanager.relatorios.dtos;

public record VendasPorCanal(String canal, long pedidos, long cancelados, String cobrancaOriginal) {}
