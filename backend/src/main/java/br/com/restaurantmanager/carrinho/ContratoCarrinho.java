package br.com.restaurantmanager.carrinho;

import br.com.restaurantmanager.catalogo.ContratoCatalogo.TipoProduto;
import br.com.restaurantmanager.unidades.CanalAtendimento;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;

public final class ContratoCarrinho {
    private ContratoCarrinho() {}

    public record SelecaoAdicional(@NotNull UUID adicionalId, @NotNull @Min(1) @Max(10) Integer quantidade) {}

    public record Escolha(
            @NotNull UUID grupoId,
            @NotNull UUID opcaoId,
            @NotNull @Min(1) @Max(20) Integer quantidade,
            @NotNull @Size(max = 20) List<@NotNull @Valid SelecaoAdicional> adicionais) {}

    public record Linha(
            @NotNull UUID id,
            @NotNull UUID produtoId,
            @NotNull @Min(1) @Max(99) Integer quantidade,
            @NotNull @Size(max = 20) List<@NotNull @Valid SelecaoAdicional> adicionais,
            @NotNull @Size(max = 200) List<@NotNull @Valid Escolha> escolhas) {}

    public record Calcular(
            @NotNull UUID unidadeId,
            @NotNull CanalAtendimento canal,
            @NotNull @Size(min = 1, max = 50) List<@NotNull @Valid Linha> linhas,
            @Pattern(regexp = "[a-f0-9]{64}") String revisaoAnterior) {}

    public record SnapshotAdicional(UUID adicionalId, String nome, int quantidade, String precoUnitario, String total) {}

    public record SnapshotEscolha(UUID grupoId, String grupo, UUID opcaoId, UUID produtoId, String nome,
            int quantidade, String acrescimo, List<SnapshotAdicional> adicionais, String total) {}

    public record SnapshotLinha(UUID id, UUID produtoId, String nome, TipoProduto tipo, int quantidade,
            String precoBase, String precoUnitario, String subtotal, List<SnapshotAdicional> adicionais,
            List<SnapshotEscolha> escolhas) {}

    public record Resumo(UUID unidadeId, CanalAtendimento canal, String moeda, String revisao,
            boolean requerConfirmacao, List<SnapshotLinha> linhas, String subtotal, String total) {}
}
