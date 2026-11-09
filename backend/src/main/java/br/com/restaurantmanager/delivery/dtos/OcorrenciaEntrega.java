package br.com.restaurantmanager.delivery.dtos;

public record OcorrenciaEntrega(
        String motivo, String estado, Boolean devolverTaxa, String decisao) {}
