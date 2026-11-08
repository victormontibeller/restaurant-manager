package br.com.restaurantmanager.pedidos.dtos;

import java.util.List;

public record EscolhaPreparo(String grupo, String nome, int quantidade, List<AdicionalPreparo> adicionais) {}
