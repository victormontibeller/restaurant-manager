package br.com.restaurantmanager.relatorios.dtos;

import java.time.LocalDate;

public record DiaFinanceiro(LocalDate data, String recebido, String devolvido, String ajustes) {}
