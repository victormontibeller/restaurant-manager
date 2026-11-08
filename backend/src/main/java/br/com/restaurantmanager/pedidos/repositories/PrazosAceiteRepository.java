package br.com.restaurantmanager.pedidos.repositories;

import br.com.restaurantmanager.pedidos.dtos.PrazosAceite;
import jakarta.persistence.EntityManager;
import java.util.UUID;
import org.hibernate.Session;
import org.springframework.stereotype.Repository;

@Repository
public class PrazosAceiteRepository {
    private final EntityManager em;

    public PrazosAceiteRepository(EntityManager em) {
        this.em = em;
    }

    public PrazosAceite consultar(UUID unidade) {
        Object[] empresa = em.unwrap(Session.class).createNativeQuery(
                "select versao,alerta_segundos,expiracao_segundos from prazo_aceite_empresa where id=1", Object[].class).getSingleResult();
        if (unidade == null) return new PrazosAceite(((Number) empresa[0]).longValue(), ((Number) empresa[1]).intValue(), ((Number) empresa[2]).intValue(), false);
        Object[] local = em.unwrap(Session.class).createNativeQuery(
                "select versao,alerta_segundos,expiracao_segundos from prazo_aceite_unidade where unidade_id=:id", Object[].class)
                .setParameter("id", unidade).getResultStream().findFirst().orElse(null);
        boolean herdado = local == null || local[1] == null;
        return new PrazosAceite(local == null ? 0 : ((Number) local[0]).longValue(),
                ((Number) (herdado ? empresa[1] : local[1])).intValue(),
                ((Number) (herdado ? empresa[2] : local[2])).intValue(), herdado);
    }

    public void salvar(UUID unidade, PrazosAceite prazos) {
        if (unidade == null) {
            em.createNativeQuery("update prazo_aceite_empresa set versao=:versao,alerta_segundos=:alerta,expiracao_segundos=:expiracao where id=1")
                    .setParameter("versao", prazos.versao()).setParameter("alerta", prazos.alertaSegundos())
                    .setParameter("expiracao", prazos.expiracaoSegundos()).executeUpdate();
            return;
        }
        em.createNativeQuery("""
                insert into prazo_aceite_unidade(unidade_id,versao,alerta_segundos,expiracao_segundos)
                values (:unidade,:versao,:alerta,:expiracao) on conflict(unidade_id) do update
                set versao=excluded.versao,alerta_segundos=excluded.alerta_segundos,expiracao_segundos=excluded.expiracao_segundos
                """).setParameter("unidade", unidade).setParameter("versao", prazos.versao())
                .setParameter("alerta", prazos.herdado() ? null : prazos.alertaSegundos())
                .setParameter("expiracao", prazos.herdado() ? null : prazos.expiracaoSegundos()).executeUpdate();
    }
}
