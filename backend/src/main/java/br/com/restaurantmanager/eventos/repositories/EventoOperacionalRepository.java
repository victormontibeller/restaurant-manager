package br.com.restaurantmanager.eventos.repositories;

import br.com.restaurantmanager.eventos.dtos.EventoOperacionalResposta;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class EventoOperacionalRepository {
    private final EntityManager em;

    public EventoOperacionalRepository(EntityManager em) {
        this.em = em;
    }

    public void registrar(String fluxo, UUID unidade, String tipo, UUID pedido, UUID comanda) {
        em.createNativeQuery("insert into fluxo_operacional(chave,unidade_id) values (:fluxo,:unidade) on conflict do nothing")
                .setParameter("fluxo", fluxo).setParameter("unidade", unidade).executeUpdate();
        // O contador transacional serializa commits; sequence SQL deixaria lacunas ainda não visíveis.
        em.createNativeQuery("update fluxo_operacional set sequencia=sequencia+1 where chave=:fluxo")
                .setParameter("fluxo", fluxo).executeUpdate();
        em.createNativeQuery("insert into evento_operacional(fluxo,sequencia,tipo,pedido_id,comanda_id,ocorrido_em) "
                + "select chave,sequencia,:tipo,:pedido,:comanda,clock_timestamp() from fluxo_operacional where chave=:fluxo")
                .setParameter("fluxo", fluxo).setParameter("tipo", tipo).setParameter("pedido", pedido)
                .setParameter("comanda", comanda).executeUpdate();
    }

    public long atual(String fluxo) {
        var valores = em.createNativeQuery("select sequencia from fluxo_operacional where chave=:fluxo", Long.class)
                .setParameter("fluxo", fluxo).getResultList();
        return valores.isEmpty() ? 0 : (Long) valores.getFirst();
    }

    @SuppressWarnings("unchecked")
    public List<EventoOperacionalResposta> consultar(String fluxo, String prefixo, long depois, long ate) {
        List<Object[]> linhas = em.createNativeQuery("select sequencia,tipo,pedido_id,comanda_id,"
                + "cast(extract(epoch from ocorrido_em)*1000 as bigint) from evento_operacional "
                + "where fluxo=:fluxo and sequencia>:depois and sequencia<=:ate order by sequencia")
                .setParameter("fluxo", fluxo).setParameter("depois", depois).setParameter("ate", ate)
                .setMaxResults(51).getResultList();
        return linhas.stream().map(row -> new EventoOperacionalResposta(prefixo + row[0], (String) row[1],
                (UUID) row[2], (UUID) row[3], Instant.ofEpochMilli(((Number) row[4]).longValue()))).toList();
    }
}
