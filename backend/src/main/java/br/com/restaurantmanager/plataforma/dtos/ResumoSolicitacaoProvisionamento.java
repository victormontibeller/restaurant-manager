package br.com.restaurantmanager.plataforma.dtos;

import java.util.UUID;

public record ResumoSolicitacaoProvisionamento(
        UUID id,
        String nome,
        String host,
        String estado,
        long versao,
        String ultimaFalha) {}
