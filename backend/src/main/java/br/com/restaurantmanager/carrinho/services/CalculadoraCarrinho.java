package br.com.restaurantmanager.carrinho.services;

import br.com.restaurantmanager.carrinho.dtos.Escolha;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.carrinho.dtos.SelecaoAdicional;
import br.com.restaurantmanager.carrinho.dtos.SnapshotAdicional;
import br.com.restaurantmanager.carrinho.dtos.SnapshotEscolha;
import br.com.restaurantmanager.carrinho.dtos.SnapshotLinha;
import br.com.restaurantmanager.catalogo.dtos.Adicional;
import br.com.restaurantmanager.catalogo.dtos.ProdutoPublico;
import br.com.restaurantmanager.catalogo.exceptions.ErrosCatalogo;
import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.catalogo.models.TipoProduto;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class CalculadoraCarrinho {
    public SnapshotLinha calcular(Linha linha, ProdutoPublico produto) {
        if (!produto.id().equals(linha.produtoId())) throw ErrosCatalogo.inexistente();
        if (!produto.disponivel()) {
            throw ErrosCatalogo.regra("O produto está indisponível para esta unidade e canal. Revise o carrinho.");
        }
        exigirQuantidade(linha.quantidade(), 99, "A quantidade do produto deve estar entre 1 e 99.");
        if (produto.tipo() == TipoProduto.SIMPLES && !linha.escolhas().isEmpty()) {
            throw ErrosCatalogo.regra("Produto simples não recebe escolhas de combo.");
        }
        if (produto.tipo() == TipoProduto.COMBO && !linha.adicionais().isEmpty()) {
            throw ErrosCatalogo.regra("Os adicionais de combo devem estar vinculados às opções permitidas.");
        }

        var adicionais = adicionais(linha.adicionais(), produto.adicionais());
        var escolhas = produto.tipo() == TipoProduto.COMBO ? escolhas(linha.escolhas(), produto) : List.<SnapshotEscolha>of();
        BigDecimal base = Dinheiro.ler(produto.preco());
        BigDecimal unitario = base.add(totalAdicionais(adicionais)).add(escolhas.stream()
                .map(e -> new BigDecimal(e.total())).reduce(Dinheiro.ZERO, BigDecimal::add));
        BigDecimal subtotal = unitario.multiply(BigDecimal.valueOf(linha.quantidade()));
        return new SnapshotLinha(linha.id(), produto.id(), produto.nome(), produto.tipo(), linha.quantidade(),
                Dinheiro.texto(base), Dinheiro.texto(unitario), Dinheiro.texto(subtotal), adicionais, escolhas);
    }

    private List<SnapshotEscolha> escolhas(List<Escolha> selecoes, ProdutoPublico produto) {
        Map<UUID, Integer> quantidadesGrupo = new HashMap<>();
        Map<UUID, Integer> quantidadesOpcao = new HashMap<>();
        var snapshots = new ArrayList<SnapshotEscolha>();
        for (var selecao : selecoes) {
            exigirQuantidade(selecao.quantidade(), 20, "A quantidade de uma opção deve estar entre 1 e 20.");
            var grupo = produto.grupos().stream().filter(g -> g.id().equals(selecao.grupoId()))
                    .findFirst().orElseThrow(ErrosCatalogo::inexistente);
            var opcao = grupo.opcoes().stream().filter(o -> o.id().equals(selecao.opcaoId()))
                    .findFirst().orElseThrow(ErrosCatalogo::inexistente);
            if (!opcao.disponivel()) {
                throw ErrosCatalogo.regra("Uma opção escolhida ficou indisponível. Escolha outra opção explicitamente.");
            }
            int totalOpcao = quantidadesOpcao.merge(opcao.id(), selecao.quantidade(), Integer::sum);
            if (totalOpcao > opcao.limite()) {
                throw ErrosCatalogo.regra("A quantidade escolhida supera o limite da opção no combo.");
            }
            quantidadesGrupo.merge(grupo.id(), selecao.quantidade(), Integer::sum);
            var permitidos = opcao.adicionais().stream()
                    .filter(a -> opcao.adicionaisPermitidos().contains(a.id())).toList();
            var adicionais = adicionais(selecao.adicionais(), permitidos);
            BigDecimal total = Dinheiro.ler(opcao.acrescimo()).add(totalAdicionais(adicionais))
                    .multiply(BigDecimal.valueOf(selecao.quantidade()));
            snapshots.add(new SnapshotEscolha(grupo.id(), grupo.nome(), opcao.id(), opcao.produtoId(), opcao.nome(),
                    selecao.quantidade(), opcao.acrescimo(), adicionais, Dinheiro.texto(total)));
        }

        for (var grupo : produto.grupos()) {
            int quantidade = quantidadesGrupo.getOrDefault(grupo.id(), 0);
            if (quantidade < grupo.minimo() || quantidade > grupo.maximo()) {
                throw ErrosCatalogo.regra("A quantidade de escolhas não atende aos limites do grupo do combo.");
            }
        }
        return List.copyOf(snapshots);
    }

    private List<SnapshotAdicional> adicionais(List<SelecaoAdicional> selecoes, List<Adicional> permitidos) {
        var usados = new HashSet<UUID>();
        var snapshots = new ArrayList<SnapshotAdicional>();
        for (var selecao : selecoes) {
            if (!usados.add(selecao.adicionalId())) {
                throw ErrosCatalogo.regra("Não repita um adicional na mesma configuração.");
            }
            var adicional = permitidos.stream().filter(a -> a.ativo() && a.id().equals(selecao.adicionalId()))
                    .findFirst().orElseThrow(ErrosCatalogo::inexistente);
            exigirQuantidade(selecao.quantidade(), adicional.maximo(), "A quantidade de adicionais supera o limite permitido.");
            BigDecimal preco = Dinheiro.ler(adicional.preco());
            snapshots.add(new SnapshotAdicional(adicional.id(), adicional.nome(), selecao.quantidade(),
                    Dinheiro.texto(preco), Dinheiro.texto(preco.multiply(BigDecimal.valueOf(selecao.quantidade())))));
        }
        return List.copyOf(snapshots);
    }

    private BigDecimal totalAdicionais(List<SnapshotAdicional> adicionais) {
        return adicionais.stream().map(a -> new BigDecimal(a.total())).reduce(Dinheiro.ZERO, BigDecimal::add);
    }

    private void exigirQuantidade(int quantidade, int maximo, String mensagem) {
        if (quantidade < 1 || quantidade > maximo) throw ErrosCatalogo.regra(mensagem);
    }
}
