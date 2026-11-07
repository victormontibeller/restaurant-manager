package br.com.restaurantmanager.catalogo.dtos;

import br.com.restaurantmanager.catalogo.models.TipoProduto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public record Produto(
        @NotNull UUID id,
        @NotNull @Min(0) Long versao,
        @NotBlank @Size(max = 120) String nome,
        @NotNull @Size(max = 2000) String descricao,
        @NotNull UUID categoriaId,
        @NotNull TipoProduto tipo,
        @NotNull Boolean ativo,
        @NotNull Boolean sugerido,
        UUID midiaId,
        @NotNull @Size(max = 20) List<@NotNull @Valid Adicional> adicionais,
        @NotNull @Size(max = 10) List<@NotNull @Valid Grupo> grupos) {}
