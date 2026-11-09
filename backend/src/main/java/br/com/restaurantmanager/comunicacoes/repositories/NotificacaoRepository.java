package br.com.restaurantmanager.comunicacoes.repositories;

import br.com.restaurantmanager.comunicacoes.dtos.NotificacaoOperacional;
import br.com.restaurantmanager.comunicacoes.dtos.TrabalhoNotificacao;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class NotificacaoRepository {
    private final EntityManager em;

    public NotificacaoRepository(EntityManager em) {
        this.em = em;
    }

    public void registrar(UUID unidade, UUID pedido, UUID referencia, String tipo) {
        em.createNativeQuery(
                        "insert into"
                            + " notificacao_operacional(id,unidade_id,pedido_id,referencia,tipo)"
                            + " values (:id,:u,:p,:r,:t) on conflict(pedido_id,tipo,referencia) do"
                            + " nothing")
                .setParameter("id", UUID.randomUUID())
                .setParameter("u", unidade)
                .setParameter("p", pedido)
                .setParameter("r", referencia)
                .setParameter("t", tipo)
                .executeUpdate();
    }

    public List<NotificacaoOperacional> listar(UUID unidade, int pagina) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select id,pedido_id,tipo,estado,tentativas from notificacao_operacional"
                            + " where unidade_id=:u order by criada_em desc,id",
                        Object[].class)
                .setParameter("u", unidade)
                .setFirstResult(pagina * 50)
                .setMaxResults(50)
                .getResultStream()
                .map(
                        r ->
                                new NotificacaoOperacional(
                                        (UUID) r[0],
                                        (UUID) r[1],
                                        (String) r[2],
                                        (String) r[3],
                                        ((Number) r[4]).intValue()))
                .toList();
    }

    public TrabalhoNotificacao reivindicar() {
        em.createNativeQuery(
                        "update notificacao_operacional set"
                            + " estado='FALHOU',conteudo=null,lease_id=null,lease_ate=null,ultima_falha='LeaseExpirada'"
                            + " where estado='PENDENTE' and tentativas>=5 and lease_ate<=now()")
                .executeUpdate();
        var linha =
                em.unwrap(Session.class)
                        .createNativeQuery(
                                "select id,pedido_id,tipo,conteudo from notificacao_operacional"
                                    + " where estado='PENDENTE' and tentativas<5 and"
                                    + " proximo_em<=now() and (lease_ate is null or"
                                    + " lease_ate<=now()) order by criada_em,id for update skip"
                                    + " locked",
                                Object[].class)
                        .setMaxResults(1)
                        .getResultStream()
                        .findFirst();
        if (linha.isEmpty()) return null;
        Object[] r = linha.get();
        UUID lease = UUID.randomUUID();
        em.createNativeQuery(
                        "update notificacao_operacional set lease_id=:l,lease_ate=now()+interval '2"
                            + " minutes',tentativas=tentativas+1 where id=:id")
                .setParameter("l", lease)
                .setParameter("id", r[0])
                .executeUpdate();
        return new TrabalhoNotificacao(
                (UUID) r[0], (UUID) r[1], (String) r[2], lease, (String) r[3]);
    }

    public void conteudo(TrabalhoNotificacao t, String cifra) {
        em.createNativeQuery(
                        "update notificacao_operacional set conteudo=:c where id=:id and"
                            + " lease_id=:l")
                .setParameter("id", t.id())
                .setParameter("l", t.leaseId())
                .setParameter("c", cifra)
                .executeUpdate();
    }

    public void concluir(TrabalhoNotificacao t, boolean sucesso) {
        em.createNativeQuery(
                        """
update notificacao_operacional set estado=case when :sucesso then 'CAPTURADO' when tentativas>=5 then 'FALHOU' else 'PENDENTE' end,
conteudo=case when :sucesso or tentativas>=5 then null else conteudo end,
ultima_falha=case when :sucesso then null else 'CAPTURA_INDISPONIVEL' end,
proximo_em=now()+tentativas*interval '30 seconds',lease_id=null,lease_ate=null
where id=:id and lease_id=:l and lease_ate>now()
""")
                .setParameter("id", t.id())
                .setParameter("l", t.leaseId())
                .setParameter("sucesso", sucesso)
                .executeUpdate();
    }
}
