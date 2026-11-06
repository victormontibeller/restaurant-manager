package br.com.restaurantmanager.catalogo.dtos;

import java.time.Instant;
import java.util.List;

public record CatalogoPublico(
        List<ProdutoPublico> itens,
        boolean temMais,
        List<Categoria> categorias,
        boolean aberto,
        Instant consultadoEm,
        String revisao) {}
