package br.com.restaurantmanager.catalogo.repositories;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.hibernate.Session;
import org.hibernate.query.NativeQuery;
import org.springframework.stereotype.Repository;

@Repository
public class FavoritosRepository {
    private final EntityManager em;

    public FavoritosRepository(EntityManager em) {
        this.em = em;
    }

    private <T> NativeQuery<T> consulta(String sql, Class<T> tipo) {
        return em.unwrap(Session.class).createNativeQuery(sql, tipo);
    }

    public void bloquear(UUID usuario) {
        // Serializa o limite por titular sem bloquear escritas de catálogo de outros clientes.
        consulta("select 1 from pg_advisory_xact_lock(hashtextextended(:chave, 0))", Integer.class)
                .setParameter("chave", "favoritos:" + usuario).getSingleResult();
        em.clear();
    }

    public List<UUID> listar(UUID usuario) {
        return consulta("""
                select f.produto_id from favorito f
                join produto p on p.id = f.produto_id
                join categoria c on c.id = p.categoria_id
                where f.usuario_id = :usuario and p.ativo and c.ativa
                order by f.criado_em, f.produto_id
                """, UUID.class).setParameter("usuario", usuario).getResultList();
    }

    public boolean existe(UUID usuario, UUID produto) {
        return consulta("select exists (select 1 from favorito where usuario_id = :usuario and produto_id = :produto)", Boolean.class)
                .setParameter("usuario", usuario).setParameter("produto", produto).getSingleResult();
    }

    public long contar(UUID usuario) {
        return consulta("select count(*) from favorito where usuario_id = :usuario", Long.class)
                .setParameter("usuario", usuario).getSingleResult();
    }

    public void removerInativos(UUID usuario) {
        em.createNativeQuery("""
                delete from favorito f using produto p, categoria c
                 where f.usuario_id = :usuario and f.produto_id = p.id
                   and p.categoria_id = c.id and (not p.ativo or not c.ativa)
                """).setParameter("usuario", usuario).executeUpdate();
    }

    public void incluir(UUID usuario, UUID produto) {
        em.createNativeQuery("insert into favorito(usuario_id, produto_id) values (:usuario, :produto) on conflict do nothing")
                .setParameter("usuario", usuario).setParameter("produto", produto).executeUpdate();
    }

    public void remover(UUID usuario, UUID produto) {
        em.createNativeQuery("delete from favorito where usuario_id = :usuario and produto_id = :produto")
                .setParameter("usuario", usuario).setParameter("produto", produto).executeUpdate();
    }
}
