package br.com.restaurantmanager.pedidos.dtos;

import java.time.Instant;

public record HistoricoPedido(String tipo, String motivo, Instant ocorridoEm) {}
