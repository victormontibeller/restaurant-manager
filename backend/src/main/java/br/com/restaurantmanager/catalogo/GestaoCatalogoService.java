package br.com.restaurantmanager.catalogo;

import br.com.restaurantmanager.catalogo.ContratoCatalogo.Categoria;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Pagina;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Produto;
import br.com.restaurantmanager.identidade.Acao;
import br.com.restaurantmanager.identidade.AcessosService;
import br.com.restaurantmanager.identidade.AuthFailure;
import br.com.restaurantmanager.identidade.IdentidadeAtual;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GestaoCatalogoService {
    private final CatalogoRepository repository;
    private final AcessosService acessos;
    private final ValidacaoProduto validacao;

    public GestaoCatalogoService(CatalogoRepository repository, AcessosService acessos, ValidacaoProduto validacao) {
        this.repository = repository;
        this.acessos = acessos;
        this.validacao = validacao;
    }

    @Transactional
    public Pagina<Categoria> categorias(IdentidadeAtual ator, int pagina) {
        acessos.autorizar(ator, Acao.CATALOGO_EDITAR, null);
        return repository.categorias(pagina);
    }

    @Transactional
    public Pagina<Produto> produtos(IdentidadeAtual ator, int pagina) {
        acessos.autorizar(ator, Acao.CATALOGO_EDITAR, null);
        return repository.produtos(pagina);
    }

    @Transactional
    public Produto produto(IdentidadeAtual ator, UUID id) {
        acessos.autorizar(ator, Acao.CATALOGO_EDITAR, null);
        return repository.produto(id).orElseThrow(ErrosCatalogo::inexistente);
    }

    @Transactional
    public Categoria criarCategoria(IdentidadeAtual ator, Categoria body) {
        escrita(ator);
        exigirVersaoCriacao(body.versao());
        var nova = new Categoria(body.id(), body.nome().strip(), body.ativa(), 0L);
        String payload = repository.json(nova);
        var existente = repository.categoria(nova.id());
        if (existente.isPresent()) {
            if (!repository.mesmaCriacao(false, nova.id(), ator, payload)) throw ErrosCatalogo.conflito();
            return existente.get();
        }
        repository.criarCategoria(nova, ator, payload);
        repository.auditar(ator, nova.id(), null, "CATEGORIA_CRIADA", null, nova);
        return nova;
    }

    @Transactional
    public Categoria alterarCategoria(IdentidadeAtual ator, UUID id, Categoria body) {
        escrita(ator);
        exigirId(id, body.id());
        var atual = repository.categoria(id).orElseThrow(ErrosCatalogo::inexistente);
        if (!atual.versao().equals(body.versao())) throw ErrosCatalogo.conflito();
        var solicitado = new Categoria(id, body.nome().strip(), body.ativa(), body.versao());
        if (solicitado.equals(atual)) return atual;
        var novo = new Categoria(id, solicitado.nome(), solicitado.ativa(), Math.incrementExact(atual.versao()));
        repository.alterarCategoria(novo);
        repository.auditar(ator, id, null, "CATEGORIA_ALTERADA", atual, novo);
        return novo;
    }

    @Transactional
    public Produto criarProduto(IdentidadeAtual ator, Produto body) {
        escrita(ator);
        exigirVersaoCriacao(body.versao());
        var novo = validacao.normalizar(body);
        String payload = repository.json(novo);
        var existente = repository.produto(novo.id());
        if (existente.isPresent()) {
            if (!repository.mesmaCriacao(true, novo.id(), ator, payload)) throw ErrosCatalogo.conflito();
            return existente.get();
        }
        validacao.referencias(novo, null);
        repository.criarProduto(novo, ator, payload);
        repository.auditar(ator, novo.id(), null, "PRODUTO_CRIADO", null, novo);
        return novo;
    }

    @Transactional
    public Produto alterarProduto(IdentidadeAtual ator, UUID id, Produto body) {
        escrita(ator);
        exigirId(id, body.id());
        var atual = repository.produto(id).orElseThrow(ErrosCatalogo::inexistente);
        if (!atual.versao().equals(body.versao())) throw ErrosCatalogo.conflito();
        var solicitado = validacao.normalizar(body);
        if (solicitado.equals(atual)) return atual;
        validacao.referencias(solicitado, atual);
        var novo = new Produto(id, Math.incrementExact(atual.versao()), solicitado.nome(), solicitado.descricao(),
                solicitado.categoriaId(), solicitado.tipo(), solicitado.ativo(), solicitado.sugerido(),
                solicitado.midiaId(), solicitado.adicionais(), solicitado.grupos());
        repository.alterarProduto(novo);
        repository.auditar(ator, id, null, "PRODUTO_ALTERADO", atual, novo);
        return novo;
    }

    private void escrita(IdentidadeAtual ator) {
        // A política precede o agregado: uma revogação concluída sempre impede a escrita seguinte.
        acessos.autorizar(ator, Acao.CATALOGO_EDITAR, null);
        repository.bloquearEscrita();
        acessos.autorizar(ator, Acao.CATALOGO_EDITAR, null);
    }

    private void exigirVersaoCriacao(long versao) {
        if (versao != 0) throw ErrosCatalogo.conflito();
    }

    private void exigirId(UUID id, UUID body) {
        if (!id.equals(body)) {
            throw new AuthFailure(400, "ENTRADA_INVALIDA", "O identificador deve corresponder ao recurso da rota.");
        }
    }
}
