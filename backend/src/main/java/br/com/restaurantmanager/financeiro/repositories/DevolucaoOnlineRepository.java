package br.com.restaurantmanager.financeiro.repositories;

import br.com.restaurantmanager.financeiro.dtos.DevolucaoOnlineTrabalho;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Repository
public class DevolucaoOnlineRepository {
    private final EntityManager em;

    public DevolucaoOnlineRepository(EntityManager em) {
        this.em = em;
    }

    public DevolucaoOnlineTrabalho reivindicar() {
        em.createNativeQuery(
                        "update devolucao set"
                            + " estado='FALHOU',ultima_falha='LeaseExpirada',lease_id=null,lease_ate=null"
                            + " where checkout_id is not null and tentativas>=5 and"
                            + " lease_ate<=now() and estado<>'CONFIRMADA'")
                .executeUpdate();
        var id =
                em.unwrap(Session.class)
                        .createNativeQuery(
                                """
select d.id from devolucao d join pagamento_checkout p on p.id=d.checkout_id
where d.estado in ('SOLICITADA','EM_PROCESSAMENTO','EM_RECONCILIACAO') and d.tentativas<5
and d.proximo_em<=now() and (d.lease_ate is null or d.lease_ate<=now())
and not exists(select 1 from devolucao outra where outra.checkout_id=d.checkout_id and outra.id<>d.id and outra.lease_ate>now())
order by d.criada_em,d.id for update of d,p skip locked
""",
                                UUID.class)
                        .setMaxResults(1)
                        .getResultStream()
                        .findFirst();
        if (id.isEmpty()) return null;
        UUID lease = UUID.randomUUID();
        em.createNativeQuery(
                        "update devolucao set"
                            + " estado='EM_PROCESSAMENTO',lease_id=:l,lease_ate=now()+interval '2"
                            + " minutes',tentativas=tentativas+1 where id=:id")
                .setParameter("l", lease)
                .setParameter("id", id.get())
                .executeUpdate();
        Object[] r =
                em.unwrap(Session.class)
                        .createNativeQuery(
                                "select"
                                    + " d.id,d.checkout_id,d.cobranca_id,p.pedido_id,r.transacao_externa,d.valor"
                                    + " from devolucao d join recebimento r on"
                                    + " r.id=d.recebimento_id join pagamento_checkout p on"
                                    + " p.id=d.checkout_id where d.id=:id",
                                Object[].class)
                        .setParameter("id", id.get())
                        .getSingleResult();
        return new DevolucaoOnlineTrabalho(
                (UUID) r[0],
                (UUID) r[1],
                (UUID) r[2],
                (UUID) r[3],
                (String) r[4],
                ((BigDecimal) r[5]).toPlainString(),
                lease);
    }

    public List<String> conhecidos(UUID checkout) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select externo_id from devolucao where checkout_id=:id and externo_id is"
                            + " not null",
                        String.class)
                .setParameter("id", checkout)
                .getResultList();
    }

    public boolean confirmar(DevolucaoOnlineTrabalho d, String externo) {
        var atual =
                em.unwrap(Session.class)
                        .createNativeQuery(
                                "select id from devolucao where id=:id and lease_id=:l and"
                                    + " lease_ate>now() for update",
                                UUID.class)
                        .setParameter("id", d.id())
                        .setParameter("l", d.leaseId())
                        .getResultStream()
                        .findFirst();
        if (atual.isEmpty()) return false;
        em.createNativeQuery(
                        "update devolucao set"
                            + " estado='CONFIRMADA',externo_id=:e,confirmada_em=now(),lease_id=null,lease_ate=null,ultima_falha=null"
                            + " where id=:id")
                .setParameter("id", d.id())
                .setParameter("e", externo)
                .executeUpdate();
        em.createNativeQuery(
                        "update cobranca set"
                            + " devolvido_confirmado=devolvido_confirmado+:v,pendencia_financeira=exists(select"
                            + " 1 from devolucao where cobranca_id=:c and estado<>'CONFIRMADA')"
                            + " where id=:c")
                .setParameter("c", d.cobrancaId())
                .setParameter("v", new BigDecimal(d.valor()))
                .executeUpdate();
        return true;
    }

    public boolean falhar(DevolucaoOnlineTrabalho d, String tipo) {
        int alteradas =
                em.createNativeQuery(
                                "update devolucao set estado=case when tentativas>=5 then 'FALHOU'"
                                    + " else 'EM_RECONCILIACAO'"
                                    + " end,ultima_falha=:tipo,lease_id=null,lease_ate=null,proximo_em=now()+tentativas*interval"
                                    + " '30 seconds' where id=:id and lease_id=:l")
                        .setParameter("id", d.id())
                        .setParameter("l", d.leaseId())
                        .setParameter("tipo", tipo)
                        .executeUpdate();
        return alteradas == 1
                && em.unwrap(Session.class)
                        .createNativeQuery(
                                "select estado from devolucao where id=:id", String.class)
                        .setParameter("id", d.id())
                        .getSingleResult()
                        .equals("FALHOU");
    }

    public void reconciliar(UUID id, UUID cobranca) {
        em.createNativeQuery(
                        "update devolucao set"
                            + " estado='EM_RECONCILIACAO',tentativas=0,proximo_em=now() where"
                            + " id=:id and cobranca_id=:c and checkout_id is not null and"
                            + " estado<>'CONFIRMADA' and lease_id is null")
                .setParameter("id", id)
                .setParameter("c", cobranca)
                .executeUpdate();
    }
}
