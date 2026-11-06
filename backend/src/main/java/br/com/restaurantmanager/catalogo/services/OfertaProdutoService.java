package br.com.restaurantmanager.catalogo.services;

import br.com.restaurantmanager.catalogo.dtos.AlterarOferta;
import br.com.restaurantmanager.catalogo.dtos.Oferta;
import br.com.restaurantmanager.catalogo.exceptions.ErrosCatalogo;
import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.catalogo.repositories.CatalogoRepository;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import java.util.HashSet;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OfertaProdutoService {
    private final CatalogoRepository repository;
    private final AcessosService acessos;

    public OfertaProdutoService(CatalogoRepository repository, AcessosService acessos) {
        this.repository = repository;
        this.acessos = acessos;
    }

    @Transactional
    public Oferta consultar(IdentidadeAtual ator, UUID produto, UUID unidade) {
        acessos.autorizar(ator, Acao.CATALOGO_CONSULTAR, unidade);
        repository.produto(produto).orElseThrow(ErrosCatalogo::inexistente);
        return repository.oferta(produto, unidade);
    }

    @Transactional
    public Oferta alterar(IdentidadeAtual ator, UUID produto, UUID unidade, AlterarOferta body) {
        acessos.autorizar(ator, Acao.CATALOGO_UNIDADE, unidade);
        repository.bloquearEscrita();
        acessos.autorizar(ator, Acao.CATALOGO_UNIDADE, unidade);
        repository.produto(produto).orElseThrow(ErrosCatalogo::inexistente);
        var atual = repository.oferta(produto, unidade);
        if (atual.versao() != body.versao()) throw ErrosCatalogo.conflito();
        if (new HashSet<>(body.canais()).size() != body.canais().size()) {
            throw ErrosCatalogo.regra("Não repita canais da oferta.");
        }
        var solicitado = new Oferta(produto, unidade, body.versao(), Dinheiro.texto(Dinheiro.ler(body.preco())),
                body.disponivel(), body.canais().stream().sorted().toList());
        if (solicitado.equals(atual)) return atual;
        var novo = new Oferta(produto, unidade, Math.incrementExact(atual.versao()), solicitado.preco(),
                solicitado.disponivel(), solicitado.canais());
        repository.salvarOferta(novo);
        repository.auditar(ator, produto, unidade, "OFERTA_ALTERADA", atual, novo);
        return novo;
    }
}
