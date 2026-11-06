package br.com.restaurantmanager.catalogo.services;

import br.com.restaurantmanager.catalogo.dtos.Adicional;
import br.com.restaurantmanager.catalogo.dtos.Grupo;
import br.com.restaurantmanager.catalogo.dtos.Opcao;
import br.com.restaurantmanager.catalogo.dtos.Produto;
import br.com.restaurantmanager.catalogo.exceptions.ErrosCatalogo;
import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.catalogo.models.TipoProduto;
import br.com.restaurantmanager.catalogo.repositories.CatalogoRepository;
import br.com.restaurantmanager.midia.services.MidiaService;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class ValidacaoProduto {
    private final CatalogoRepository repository;
    private final MidiaService midias;

    public ValidacaoProduto(CatalogoRepository repository, MidiaService midias) {
        this.repository = repository;
        this.midias = midias;
    }

    Produto normalizar(Produto produto) {
        Set<UUID> identificadores = new HashSet<>();
        var adicionais = produto.adicionais().stream().map(adicional -> {
            unico(identificadores, adicional.id());
            return new Adicional(adicional.id(), adicional.nome().strip(),
                    Dinheiro.texto(Dinheiro.ler(adicional.preco())), adicional.maximo(), adicional.ativo());
        }).toList();
        var grupos = produto.grupos().stream().map(grupo -> {
            unico(identificadores, grupo.id());
            if (grupo.minimo() > grupo.maximo()) {
                throw ErrosCatalogo.regra("O mínimo de escolhas não pode superar o máximo do grupo.");
            }
            var opcoes = grupo.opcoes().stream().map(opcao -> {
                unico(identificadores, opcao.id());
                if (new HashSet<>(opcao.adicionaisPermitidos()).size() != opcao.adicionaisPermitidos().size()) {
                    throw ErrosCatalogo.regra("Não repita adicionais permitidos na mesma opção.");
                }
                return new Opcao(opcao.id(), opcao.produtoId(), Dinheiro.texto(Dinheiro.ler(opcao.acrescimo())),
                        opcao.limite(), opcao.adicionaisPermitidos().stream().sorted().toList());
            }).toList();
            if (opcoes.stream().mapToInt(Opcao::limite).sum() < grupo.minimo()) {
                throw ErrosCatalogo.regra("As opções precisam permitir a quantidade mínima do grupo.");
            }
            return new Grupo(grupo.id(), grupo.nome().strip(), grupo.minimo(), grupo.maximo(), opcoes);
        }).toList();

        if (produto.tipo() == TipoProduto.SIMPLES && !grupos.isEmpty()) {
            throw ErrosCatalogo.regra("Produto simples não possui grupos de combo.");
        }
        if (produto.tipo() == TipoProduto.COMBO && (grupos.isEmpty() || !adicionais.isEmpty())) {
            throw ErrosCatalogo.regra("Combo precisa de grupos e recebe adicionais somente nas opções permitidas.");
        }
        return new Produto(produto.id(), produto.versao(), produto.nome().strip(), produto.descricao().strip(),
                produto.categoriaId(), produto.tipo(), produto.ativo(), produto.sugerido(), produto.midiaId(), adicionais, grupos);
    }

    void referencias(Produto produto, Produto anterior) {
        var categoria = repository.categoria(produto.categoriaId()).orElseThrow(ErrosCatalogo::inexistente);
        if (produto.ativo() && !categoria.ativa()) {
            throw ErrosCatalogo.regra("Ative a categoria antes de publicar o produto.");
        }
        if (produto.midiaId() != null) midias.exigirPublicada(produto.midiaId());

        boolean exigirOpcoesAtivas = anterior == null || (!anterior.ativo() && produto.ativo())
                || !produto.grupos().equals(anterior.grupos());
        for (var grupo : produto.grupos()) {
            for (var opcao : grupo.opcoes()) {
                if (opcao.produtoId().equals(produto.id())) {
                    throw ErrosCatalogo.regra("Um combo não pode conter a si mesmo.");
                }
                var componente = repository.produto(opcao.produtoId()).orElseThrow(ErrosCatalogo::inexistente);
                if (componente.tipo() != TipoProduto.SIMPLES || (exigirOpcoesAtivas && !componente.ativo())) {
                    throw ErrosCatalogo.regra("As opções do combo devem referenciar produtos simples ativos.");
                }
                Set<UUID> permitidos = new HashSet<>();
                componente.adicionais().stream().filter(Adicional::ativo).forEach(a -> permitidos.add(a.id()));
                if (exigirOpcoesAtivas && !permitidos.containsAll(opcao.adicionaisPermitidos())) {
                    throw ErrosCatalogo.regra("O adicional permitido deve pertencer à opção e estar ativo.");
                }
            }
        }
        if (produto.tipo() == TipoProduto.COMBO && repository.componenteDeCombo(produto.id())) {
            throw ErrosCatalogo.regra("Um produto usado como opção de combo deve continuar simples.");
        }
    }

    private void unico(Set<UUID> identificadores, UUID id) {
        if (!identificadores.add(id)) {
            throw ErrosCatalogo.regra("Não repita identificadores de adicionais, grupos ou opções no produto.");
        }
    }
}
