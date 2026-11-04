package br.com.restaurantmanager.identidade;

import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class RetencaoIdentidadeRepository {
    private final EntityManager em;
    public RetencaoIdentidadeRepository(EntityManager em) { this.em = em; }
    int expurgarSessoes(Instant limite) {
        var ids = em.createNativeQuery("select id from sessao where expira_em < :limite order by expira_em,id limit 100 for update skip locked", UUID.class)
                .setParameter("limite", limite).getResultList();
        if (ids.isEmpty()) return 0;
        em.createNativeQuery("delete from refresh_token where sessao_id in (:ids)").setParameter("ids", ids).executeUpdate();
        return em.createNativeQuery("delete from sessao where id in (:ids)").setParameter("ids", ids).executeUpdate();
    }
    int expurgarLimites(Instant limite) {
        return em.createNativeQuery("delete from limite_login where chave in (select chave from limite_login where inicio_em < :limite order by inicio_em,chave limit 100 for update skip locked)")
                .setParameter("limite", limite).executeUpdate();
    }
}
