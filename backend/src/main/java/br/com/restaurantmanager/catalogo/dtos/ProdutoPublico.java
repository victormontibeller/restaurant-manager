package br.com.restaurantmanager.catalogo.dtos;

import br.com.restaurantmanager.catalogo.models.TipoProduto;
import java.util.List;
import java.util.UUID;

public record ProdutoPublico(
        UUID id,
        long versao,
        String nome,
        String descricao,
        UUID categoriaId,
        TipoProduto tipo,
        boolean sugerido,
        UUID midiaId,
        String preco,
        boolean disponivel,
        List<Adicional> adicionais,
        List<GrupoPublico> grupos) {}
