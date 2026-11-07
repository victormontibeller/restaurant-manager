package br.com.restaurantmanager.plataforma.dtos;

import java.util.List;
import java.util.UUID;

public record EmpresaPlataforma(
        UUID id,
        String nome,
        String estado,
        long versao,
        List<String> dominios) {}
