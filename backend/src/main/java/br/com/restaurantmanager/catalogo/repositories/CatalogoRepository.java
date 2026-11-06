package br.com.restaurantmanager.catalogo.repositories;

import br.com.restaurantmanager.catalogo.dtos.Adicional;
import br.com.restaurantmanager.catalogo.dtos.Categoria;
import br.com.restaurantmanager.catalogo.dtos.Grupo;
import br.com.restaurantmanager.catalogo.dtos.Oferta;
import br.com.restaurantmanager.catalogo.dtos.Pagina;
import br.com.restaurantmanager.catalogo.dtos.Produto;
import br.com.restaurantmanager.catalogo.exceptions.ErrosCatalogo;
import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.catalogo.models.TipoProduto;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.Session;
import org.hibernate.query.NativeQuery;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

@Repository
public class CatalogoRepository {
    private static final String COLUNAS_PRODUTO = """
            p.id, p.versao, p.nome, p.descricao, p.categoria_id, p.tipo, p.ativo,
            p.sugerido, p.midia_id, cast(p.adicionais as text), cast(p.grupos as text)
            """;
    private final EntityManager em;
    private final ObjectMapper mapper;

    public CatalogoRepository(EntityManager em, ObjectMapper mapper) {
        this.em = em;
        this.mapper = mapper;
    }

    public void bloquearEscrita() {
        consulta("select versao from catalogo_revisao where id = 1 for update", Long.class)
                .getSingleResult();
        em.clear();
    }

    public void bloquearLeitura() {
        consulta("select versao from catalogo_revisao where id = 1 for share", Long.class)
                .getSingleResult();
        em.clear();
    }

    public long revisao() {
        return consulta("select versao from catalogo_revisao where id = 1", Long.class)
                .getSingleResult();
    }

    public String versaoUnidade(UUID unidade) {
        Object[] linha = consulta("""
                select u.versao, coalesce(f.versao, 0)
                  from unidade u left join funcionamento_unidade f on f.unidade_id = u.id
                 where u.id = :id and u.ativa
                """, Object[].class).setParameter("id", unidade).getResultStream().findFirst()
                .orElseThrow(ErrosCatalogo::inexistente);
        return linha[0] + ":" + linha[1];
    }

    public Optional<Categoria> categoria(UUID id) {
        return consulta("select id, nome, ativa, versao from categoria where id = :id", Object[].class)
                .setParameter("id", id).getResultStream().findFirst().map(this::categoria);
    }

    public Pagina<Categoria> categorias(int pagina) {
        var linhas = consulta("select id, nome, ativa, versao from categoria order by nome, id", Object[].class)
                .setFirstResult(pagina * 50).setMaxResults(51).getResultList();
        return new Pagina<>(linhas.stream().limit(50).map(this::categoria).toList(), linhas.size() > 50);
    }

    public List<Categoria> categoriasAtivas() {
        return consulta("select id, nome, ativa, versao from categoria where ativa order by nome, id", Object[].class)
                .getResultStream().map(this::categoria).toList();
    }

    public void criarCategoria(Categoria categoria, IdentidadeAtual ator, String payload) {
        em.createNativeQuery("""
                insert into categoria(id, nome, ativa, versao, criacao_ator, criacao_payload)
                values (:id, :nome, :ativa, :versao, :ator, :payload)
                """).setParameter("id", categoria.id()).setParameter("nome", categoria.nome())
                .setParameter("ativa", categoria.ativa()).setParameter("versao", categoria.versao())
                .setParameter("ator", ator.usuarioId()).setParameter("payload", payload).executeUpdate();
    }

    public void alterarCategoria(Categoria categoria) {
        em.createNativeQuery("update categoria set nome = :nome, ativa = :ativa, versao = :versao where id = :id")
                .setParameter("nome", categoria.nome()).setParameter("ativa", categoria.ativa())
                .setParameter("versao", categoria.versao()).setParameter("id", categoria.id()).executeUpdate();
    }

    public Optional<Produto> produto(UUID id) {
        return consulta("select " + COLUNAS_PRODUTO + " from produto p where p.id = :id", Object[].class)
                .setParameter("id", id).getResultStream().findFirst().map(this::produto);
    }

    public boolean componenteDeCombo(UUID id) {
        return consulta("""
                select exists (
                    select 1 from produto p, jsonb_array_elements(p.grupos) g,
                        jsonb_array_elements(g -> 'opcoes') o
                    where p.tipo = 'COMBO' and o ->> 'produtoId' = :id
                )
                """, Boolean.class).setParameter("id", id.toString()).getSingleResult();
    }

    public Pagina<Produto> produtos(int pagina) {
        var linhas = consulta("select " + COLUNAS_PRODUTO + " from produto p order by p.nome, p.id", Object[].class)
                .setFirstResult(pagina * 50).setMaxResults(51).getResultList();
        return new Pagina<>(linhas.stream().limit(50).map(this::produto).toList(), linhas.size() > 50);
    }

    public Pagina<Produto> produtosPublicos(UUID unidade, String busca, UUID categoria, int pagina, boolean operacional) {
        String filtroOferta = operacional ? "" : " and exists (select 1 from produto_unidade o where o.produto_id = p.id and o.unidade_id = :unidade)";
        String filtroCategoria = categoria == null ? "" : " and p.categoria_id = :categoria";
        var query = consulta("select " + COLUNAS_PRODUTO + """
                 from produto p join categoria c on c.id = p.categoria_id
                where p.ativo and c.ativa and (lower(p.nome) like :busca or lower(p.descricao) like :busca)
                """ + filtroOferta + filtroCategoria + " order by p.sugerido desc, p.nome, p.id", Object[].class)
                .setParameter("busca", "%" + busca.toLowerCase(Locale.ROOT)
                        .replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%")
                .setFirstResult(pagina * 50).setMaxResults(51);
        if (!operacional) query.setParameter("unidade", unidade);
        if (categoria != null) query.setParameter("categoria", categoria);
        var linhas = query.getResultList();
        return new Pagina<>(linhas.stream().limit(50).map(this::produto).toList(), linhas.size() > 50);
    }

    public void criarProduto(Produto produto, IdentidadeAtual ator, String payload) {
        em.createNativeQuery("""
                insert into produto(id, versao, nome, descricao, categoria_id, tipo, ativo, sugerido,
                    midia_id, adicionais, grupos, criacao_ator, criacao_payload)
                values (:id, :versao, :nome, :descricao, :categoria, :tipo, :ativo, :sugerido,
                    :midia, cast(:adicionais as jsonb), cast(:grupos as jsonb), :ator, :payload)
                """).setParameter("id", produto.id()).setParameter("versao", produto.versao())
                .setParameter("nome", produto.nome()).setParameter("descricao", produto.descricao())
                .setParameter("categoria", produto.categoriaId()).setParameter("tipo", produto.tipo().name())
                .setParameter("ativo", produto.ativo()).setParameter("sugerido", produto.sugerido())
                .setParameter("midia", produto.midiaId()).setParameter("adicionais", json(produto.adicionais()))
                .setParameter("grupos", json(produto.grupos())).setParameter("ator", ator.usuarioId())
                .setParameter("payload", payload).executeUpdate();
    }

    public void alterarProduto(Produto produto) {
        em.createNativeQuery("""
                update produto set versao = :versao, nome = :nome, descricao = :descricao,
                    categoria_id = :categoria, tipo = :tipo, ativo = :ativo, sugerido = :sugerido,
                    midia_id = :midia, adicionais = cast(:adicionais as jsonb), grupos = cast(:grupos as jsonb)
                where id = :id
                """).setParameter("id", produto.id()).setParameter("versao", produto.versao())
                .setParameter("nome", produto.nome()).setParameter("descricao", produto.descricao())
                .setParameter("categoria", produto.categoriaId()).setParameter("tipo", produto.tipo().name())
                .setParameter("ativo", produto.ativo()).setParameter("sugerido", produto.sugerido())
                .setParameter("midia", produto.midiaId()).setParameter("adicionais", json(produto.adicionais()))
                .setParameter("grupos", json(produto.grupos())).executeUpdate();
    }

    public boolean mesmaCriacao(boolean produto, UUID id, IdentidadeAtual ator, String payload) {
        String tabela = produto ? "produto" : "categoria";
        Object[] linha = consulta("select criacao_ator, criacao_payload from " + tabela + " where id = :id", Object[].class)
                .setParameter("id", id).getSingleResult();
        return ator.usuarioId().equals(linha[0]) && payload.equals(linha[1]);
    }

    public Oferta oferta(UUID produto, UUID unidade) {
        return consulta("""
                select versao, preco, disponivel, delivery, retirada, mesa from produto_unidade
                 where produto_id = :produto and unidade_id = :unidade
                """, Object[].class).setParameter("produto", produto).setParameter("unidade", unidade)
                .getResultStream().findFirst().map(linha -> {
                    var canais = new ArrayList<CanalAtendimento>();
                    if ((Boolean) linha[3]) canais.add(CanalAtendimento.DELIVERY);
                    if ((Boolean) linha[4]) canais.add(CanalAtendimento.RETIRADA);
                    if ((Boolean) linha[5]) canais.add(CanalAtendimento.MESA);
                    return new Oferta(produto, unidade, ((Number) linha[0]).longValue(),
                            Dinheiro.texto((BigDecimal) linha[1]), (Boolean) linha[2], List.copyOf(canais));
                }).orElseGet(() -> new Oferta(produto, unidade, 0, "0.00", false, List.of()));
    }

    public void salvarOferta(Oferta oferta) {
        em.createNativeQuery("""
                insert into produto_unidade(produto_id, unidade_id, versao, preco, disponivel, delivery, retirada, mesa)
                values (:produto, :unidade, :versao, :preco, :disponivel, :delivery, :retirada, :mesa)
                on conflict (produto_id, unidade_id) do update set versao = excluded.versao,
                    preco = excluded.preco, disponivel = excluded.disponivel, delivery = excluded.delivery,
                    retirada = excluded.retirada, mesa = excluded.mesa
                """).setParameter("produto", oferta.produtoId()).setParameter("unidade", oferta.unidadeId())
                .setParameter("versao", oferta.versao()).setParameter("preco", Dinheiro.ler(oferta.preco()))
                .setParameter("disponivel", oferta.disponivel())
                .setParameter("delivery", oferta.canais().contains(CanalAtendimento.DELIVERY))
                .setParameter("retirada", oferta.canais().contains(CanalAtendimento.RETIRADA))
                .setParameter("mesa", oferta.canais().contains(CanalAtendimento.MESA)).executeUpdate();
    }

    public void auditar(IdentidadeAtual ator, UUID recurso, UUID unidade, String evento, Object antes, Object depois) {
        em.createNativeQuery("""
                insert into auditoria_catalogo(id, ator_id, recurso_id, unidade_id, evento, antes, depois)
                values (:id, :ator, :recurso, :unidade, :evento, cast(:antes as jsonb), cast(:depois as jsonb))
                """).setParameter("id", UUID.randomUUID()).setParameter("ator", ator.usuarioId())
                .setParameter("recurso", recurso).setParameter("unidade", unidade).setParameter("evento", evento)
                .setParameter("antes", antes == null ? null : json(antes)).setParameter("depois", json(depois)).executeUpdate();
        em.createNativeQuery("update catalogo_revisao set versao = versao + 1 where id = 1").executeUpdate();
    }

    public String json(Object valor) {
        return mapper.writeValueAsString(valor);
    }

    private <T> NativeQuery<T> consulta(String sql, Class<T> tipo) {
        return em.unwrap(Session.class).createNativeQuery(sql, tipo);
    }

    private Categoria categoria(Object[] linha) {
        return new Categoria((UUID) linha[0], (String) linha[1], (Boolean) linha[2], ((Number) linha[3]).longValue());
    }

    private Produto produto(Object[] linha) {
        return new Produto((UUID) linha[0], ((Number) linha[1]).longValue(), (String) linha[2], (String) linha[3],
                (UUID) linha[4], TipoProduto.valueOf((String) linha[5]), (Boolean) linha[6], (Boolean) linha[7],
                (UUID) linha[8], List.of(mapper.readValue((String) linha[9], Adicional[].class)),
                List.of(mapper.readValue((String) linha[10], Grupo[].class)));
    }
}
