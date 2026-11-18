package br.com.restaurantmanager.comunicacoes.repositories;

import br.com.restaurantmanager.catalogo.dtos.Pagina;
import br.com.restaurantmanager.comunicacoes.dtos.NotificacaoOperacional;
import br.com.restaurantmanager.comunicacoes.dtos.TrabalhoNotificacao;
import br.com.restaurantmanager.shared.InstantesSql;

import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.stereotype.Repository;

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

    public Pagina<NotificacaoOperacional> listar(UUID unidade, int pagina, String tipo, String estado) {
        String sql = """
                select n.id,n.pedido_id,n.tipo,n.estado,n.tentativas,n.criada_em,
                       case when n.estado='PENDENTE' and n.tentativas<5
                            and (n.lease_ate is null or n.lease_ate<=now()) then n.proximo_em end proxima,
                       coalesce(n.lease_ate>now(),false) em_execucao,n.ultima_falha is not null falhou,
                       p.canal,p.estado estado_pedido,u.fuso
                from notificacao_operacional n join pedido p on p.id=n.pedido_id join unidade u on u.id=n.unidade_id
                where n.unidade_id=:u and (cast(:tipo as text) is null or n.tipo=:tipo)
                    and (cast(:estado as text) is null or n.estado=:estado)
                order by n.criada_em desc,n.id
                """;
        var linhas = em.unwrap(Session.class).createNativeQuery(sql, Object[].class)
                .setParameter("u", unidade).setParameter("tipo", tipo).setParameter("estado", estado)
                .setFirstResult(pagina * 50).setMaxResults(51).getResultList();
        var itens = linhas.stream().limit(50).map(r -> new NotificacaoOperacional(
                (UUID) r[0], (UUID) r[1], (String) r[2], (String) r[3], ((Number) r[4]).intValue(),
                InstantesSql.ler(r[5]), InstantesSql.ler(r[6]), (boolean) r[7], (boolean) r[8],
                (String) r[9], (String) r[10], (String) r[11])).toList();
        return new Pagina<>(itens, linhas.size() > 50);
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
