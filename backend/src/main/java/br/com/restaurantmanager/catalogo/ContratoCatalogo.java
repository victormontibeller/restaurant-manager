package br.com.restaurantmanager.catalogo;

import br.com.restaurantmanager.unidades.CanalAtendimento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import tools.jackson.databind.annotation.JsonDeserialize;

public final class ContratoCatalogo {
    private ContratoCatalogo() {}

    public enum TipoProduto { SIMPLES, COMBO }

    public record Pagina<T>(List<T> itens, boolean temMais) {}

    public record Categoria(
            @NotNull UUID id,
            @NotBlank @Size(max = 120) String nome,
            @NotNull Boolean ativa,
            @NotNull @Min(0) Long versao) {}

    public record Adicional(
            @NotNull UUID id,
            @NotBlank @Size(max = 120) String nome,
            @NotNull @JsonDeserialize(using = TextoMonetarioDeserializer.class) String preco,
            @NotNull @Min(1) @Max(10) Integer maximo,
            @NotNull Boolean ativo) {}

    public record Opcao(
            @NotNull UUID id,
            @NotNull UUID produtoId,
            @NotNull @JsonDeserialize(using = TextoMonetarioDeserializer.class) String acrescimo,
            @NotNull @Min(1) @Max(20) Integer limite,
            @NotNull @Size(max = 20) List<@NotNull UUID> adicionaisPermitidos) {}

    public record Grupo(
            @NotNull UUID id,
            @NotBlank @Size(max = 120) String nome,
            @NotNull @Min(0) @Max(20) Integer minimo,
            @NotNull @Min(1) @Max(20) Integer maximo,
            @NotNull @Size(min = 1, max = 20) List<@NotNull @Valid Opcao> opcoes) {}

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

    public record AlterarOferta(
            @NotNull @Min(0) Long versao,
            @NotNull @JsonDeserialize(using = TextoMonetarioDeserializer.class) String preco,
            @NotNull Boolean disponivel,
            @NotNull @Size(max = 3) List<@NotNull CanalAtendimento> canais) {}

    public record Oferta(UUID produtoId, UUID unidadeId, long versao, String preco,
            boolean disponivel, List<CanalAtendimento> canais) {}

    public record OpcaoPublica(UUID id, UUID produtoId, String nome, String acrescimo, int limite,
            List<UUID> adicionaisPermitidos, boolean disponivel, List<Adicional> adicionais) {}

    public record GrupoPublico(UUID id, String nome, int minimo, int maximo, List<OpcaoPublica> opcoes) {}

    public record ProdutoPublico(UUID id, long versao, String nome, String descricao, UUID categoriaId,
            TipoProduto tipo, boolean sugerido, UUID midiaId, String preco, boolean disponivel,
            List<Adicional> adicionais, List<GrupoPublico> grupos) {}

    public record CatalogoPublico(List<ProdutoPublico> itens, boolean temMais, List<Categoria> categorias,
            boolean aberto, Instant consultadoEm, String revisao) {}
}
