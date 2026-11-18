package br.com.restaurantmanager.identidade.dtos;

import java.time.Instant;
import java.util.List;

public record MinhaConta(
        String nome,
        String telefone,
        String email,
        boolean emailVerificado,
        String perfil,
        Instant criadoEm,
        long versao,
        List<UnidadePermitida> unidades) {}
