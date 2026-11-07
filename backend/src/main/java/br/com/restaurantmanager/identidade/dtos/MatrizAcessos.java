package br.com.restaurantmanager.identidade.dtos;

import java.util.List;
import java.util.Map;

public record MatrizAcessos(
        long versao,
        List<DescricaoAcao> acoes,
        Map<String, List<String>> perfis) {}
