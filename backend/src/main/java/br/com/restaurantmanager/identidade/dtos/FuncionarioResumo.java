package br.com.restaurantmanager.identidade.dtos;

import java.util.List;
import java.util.UUID;

public record FuncionarioResumo(
        UUID id,
        String email,
        String perfil,
        boolean ativo,
        long versao,
        List<UUID> unidades) {}
