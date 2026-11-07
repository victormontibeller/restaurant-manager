package br.com.restaurantmanager.midia.dtos;

public record ImagemNormalizada(
        String tipo,
        int largura,
        int altura,
        byte[] conteudo,
        String sha256) {}
