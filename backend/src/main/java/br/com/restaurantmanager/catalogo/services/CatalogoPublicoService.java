package br.com.restaurantmanager.catalogo.services;

import br.com.restaurantmanager.catalogo.dtos.Adicional;
import br.com.restaurantmanager.catalogo.dtos.CatalogoPublico;
import br.com.restaurantmanager.catalogo.dtos.Categoria;
import br.com.restaurantmanager.catalogo.dtos.ContextoCarrinho;
import br.com.restaurantmanager.catalogo.dtos.GrupoPublico;
import br.com.restaurantmanager.catalogo.dtos.OpcaoPublica;
import br.com.restaurantmanager.catalogo.dtos.Produto;
import br.com.restaurantmanager.catalogo.dtos.ProdutoPublico;
import br.com.restaurantmanager.catalogo.exceptions.ErrosCatalogo;
import br.com.restaurantmanager.catalogo.models.TipoProduto;
import br.com.restaurantmanager.catalogo.repositories.CatalogoRepository;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.unidades.dtos.FuncionamentoPublicoUnidade;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import br.com.restaurantmanager.unidades.services.FuncionamentoUnidadeService;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogoPublicoService {
    private final CatalogoRepository repository;
    private final FuncionamentoUnidadeService funcionamento;
    private final AcessosService acessos;
    private final RevisaoCatalogo revisoes;

    public CatalogoPublicoService(CatalogoRepository repository, FuncionamentoUnidadeService funcionamento,
            AcessosService acessos, RevisaoCatalogo revisoes) {
        this.repository = repository;
        this.funcionamento = funcionamento;
        this.acessos = acessos;
        this.revisoes = revisoes;
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public CatalogoPublico listar(UUID unidade, CanalAtendimento canal, String busca, UUID categoria, int pagina) {
        return listar(unidade, canal, busca, categoria, pagina, false);
    }

    @Transactional
    public CatalogoPublico operacional(IdentidadeAtual ator, UUID unidade, CanalAtendimento canal, int pagina) {
        acessos.autorizar(ator, Acao.CATALOGO_CONSULTAR, unidade);
        repository.bloquearLeitura();
        acessos.autorizar(ator, Acao.CATALOGO_CONSULTAR, unidade);
        return listar(unidade, canal, "", null, pagina, true);
    }

    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public ProdutoPublico consultar(UUID id, UUID unidade, CanalAtendimento canal) {
        var contexto = funcionamento.consultarPublico(unidade);
        return new Leitura(unidade, canal, habilitado(contexto, canal)).publicar(obterPublicavel(id));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ContextoCarrinho paraCarrinho(UUID unidade, CanalAtendimento canal, List<UUID> produtos) {
        var contexto = funcionamento.consultarPublico(unidade);
        var leitura = new Leitura(unidade, canal, habilitado(contexto, canal));
        Map<UUID, ProdutoPublico> publicados = new HashMap<>();
        produtos.forEach(id -> publicados.computeIfAbsent(id, chave -> leitura.publicar(obterPublicavel(chave))));
        return new ContextoCarrinho(Map.copyOf(publicados), aberto(contexto, canal), revisao(unidade, canal));
    }

    private CatalogoPublico listar(UUID unidade, CanalAtendimento canal, String busca, UUID categoria,
            int pagina, boolean operacional) {
        var contexto = funcionamento.consultarPublico(unidade);
        if (categoria != null && !repository.categoria(categoria).map(Categoria::ativa).orElse(false)) {
            throw ErrosCatalogo.inexistente();
        }
        var produtos = repository.produtosPublicos(unidade, busca.strip(), categoria, pagina, operacional);
        var leitura = new Leitura(unidade, canal, habilitado(contexto, canal));
        return new CatalogoPublico(produtos.itens().stream().map(leitura::publicar).toList(), produtos.temMais(),
                repository.categoriasAtivas(), aberto(contexto, canal), contexto.consultadoEm(), revisao(unidade, canal));
    }

    private String revisao(UUID unidade, CanalAtendimento canal) {
        return revisoes.gerar(unidade, canal, repository.revisao(), funcionamento.revisaoPublica(unidade));
    }

    private Produto obterPublicavel(UUID id) {
        var produto = repository.produto(id).orElseThrow(ErrosCatalogo::inexistente);
        if (!publicavel(produto)) throw ErrosCatalogo.inexistente();
        return produto;
    }

    private boolean publicavel(Produto produto) {
        return produto.ativo() && repository.categoria(produto.categoriaId())
                .map(Categoria::ativa).orElse(false);
    }

    private boolean aberto(FuncionamentoPublicoUnidade contexto, CanalAtendimento canal) {
        return contexto.canais().stream().anyMatch(c -> c.canal() == canal && c.aberto());
    }

    private boolean habilitado(FuncionamentoPublicoUnidade contexto, CanalAtendimento canal) {
        return contexto.canais().stream().anyMatch(c -> c.canal() == canal && c.habilitado());
    }

    private final class Leitura {
        private final UUID unidade;
        private final CanalAtendimento canal;
        private final boolean habilitado;
        private final Map<UUID, Produto> componentes = new HashMap<>();
        private final Map<UUID, Boolean> disponibilidade = new HashMap<>();

        private Leitura(UUID unidade, CanalAtendimento canal, boolean habilitado) {
            this.unidade = unidade;
            this.canal = canal;
            this.habilitado = habilitado;
        }

        ProdutoPublico publicar(Produto produto) {
            var oferta = repository.oferta(produto.id(), unidade);
            var grupos = produto.grupos().stream().map(grupo -> {
                var opcoes = grupo.opcoes().stream().map(opcao -> {
                    var componente = componentes.computeIfAbsent(opcao.produtoId(), id ->
                            repository.produto(id).orElseThrow(ErrosCatalogo::inexistente));
                    var adicionais = componente.adicionais().stream()
                            .filter(a -> a.ativo() && opcao.adicionaisPermitidos().contains(a.id())).toList();
                    return new OpcaoPublica(opcao.id(), opcao.produtoId(), componente.nome(), opcao.acrescimo(),
                            opcao.limite(), adicionais.stream().map(Adicional::id).toList(),
                            componente.tipo() == TipoProduto.SIMPLES && disponivel(componente), adicionais);
                }).toList();
                return new GrupoPublico(grupo.id(), grupo.nome(), grupo.minimo(), grupo.maximo(), opcoes);
            }).toList();
            boolean satisfazGrupos = grupos.stream().allMatch(g -> g.opcoes().stream()
                    .filter(OpcaoPublica::disponivel).mapToInt(OpcaoPublica::limite).sum() >= g.minimo());
            return new ProdutoPublico(produto.id(), produto.versao(), produto.nome(), produto.descricao(),
                    produto.categoriaId(), produto.tipo(), produto.sugerido(), produto.midiaId(), oferta.preco(),
                    disponivel(produto) && satisfazGrupos,
                    produto.adicionais().stream().filter(Adicional::ativo).toList(), grupos);
        }

        private boolean disponivel(Produto produto) {
            return disponibilidade.computeIfAbsent(produto.id(), id -> {
                var oferta = repository.oferta(id, unidade);
                return habilitado && publicavel(produto) && oferta.disponivel() && oferta.canais().contains(canal);
            });
        }
    }
}
