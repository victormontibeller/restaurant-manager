package br.com.restaurantmanager.cozinha.repositories;

import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import jakarta.persistence.EntityManager;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import org.hibernate.Session;
import org.hibernate.query.NativeQuery;
import org.springframework.stereotype.Repository;

@Repository
public class CozinhaPainelRepository {
    private static final String BASE = """
            from pedido p
            left join comanda c on c.id=p.comanda_id and c.unidade_id=p.unidade_id
            left join atendimento a on a.id=c.atendimento_id and a.unidade_id=p.unidade_id
            left join mesa m on m.id=a.mesa_id and m.unidade_id=p.unidade_id
            left join lateral (
                select max(u.concluido_em) pronto_em from unidade_producao u
                where u.pedido_id=p.id and u.estado='PRONTO'
            ) producao on true
            where p.unidade_id=:unidade and p.estado=:estado
            """;
    private final EntityManager em;

    public CozinhaPainelRepository(EntityManager em) {
        this.em = em;
    }

    public long total(UUID unidade, CanalAtendimento canal, String estado, Boolean anteriores, Instant inicio) {
        return parametros(consulta("select count(*) " + filtro(canal, anteriores), Long.class),
                unidade, canal, estado, anteriores, inicio).getSingleResult();
    }

    public List<Object[]> pagina(UUID unidade, CanalAtendimento canal, String estado,
            Boolean anteriores, Instant inicio, int pagina) {
        String ordem = estado.equals("PRONTO") ? "producao.pronto_em asc nulls first,p.id" : "p.criado_em,p.id";
        return parametros(consulta("select p.id,m.nome,producao.pronto_em " + filtro(canal, anteriores)
                        + " order by " + ordem, Object[].class), unidade, canal, estado, anteriores, inicio)
                .setFirstResult(pagina * 50).setMaxResults(50).getResultList();
    }

    private String filtro(CanalAtendimento canal, Boolean anteriores) {
        return BASE + (canal == null ? "" : " and p.canal=:canal")
                + (anteriores == null ? "" : anteriores
                    ? " and (producao.pronto_em<:inicio or producao.pronto_em is null)"
                    : " and producao.pronto_em>=:inicio");
    }

    private <T> NativeQuery<T> parametros(NativeQuery<T> query, UUID unidade, CanalAtendimento canal,
            String estado, Boolean anteriores, Instant inicio) {
        query.setParameter("unidade", unidade).setParameter("estado", estado);
        if (canal != null) query.setParameter("canal", canal.name());
        if (anteriores != null) query.setParameter("inicio", inicio);
        return query;
    }

    private <T> NativeQuery<T> consulta(String sql, Class<T> tipo) {
        return em.unwrap(Session.class).createNativeQuery(sql, tipo);
    }

    public static Instant instante(Object value) {
        if (value == null) return null;
        if (value instanceof Instant instant) return instant;
        if (value instanceof OffsetDateTime date) return date.toInstant();
        return ((Timestamp) value).toInstant();
    }
}
