package br.com.restaurantmanager.pagamentos.repositories;

import br.com.restaurantmanager.pagamentos.dtos.CheckoutRegistro;
import br.com.restaurantmanager.pagamentos.dtos.CheckoutResumo;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.tenancy.context.TenantScope;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.hibernate.query.NativeQuery;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Repository
public class CheckoutRepository {
    private final EntityManager em;

    public CheckoutRepository(EntityManager em) {
        this.em = em;
    }

    public String hostRetorno() {
        return query(
                        "select d.host from public.dominio d join public.empresa e on"
                            + " e.id=d.empresa_id where e.schema_name=:s order by d.host",
                        String.class)
                .setParameter("s", TenantScope.current())
                .setMaxResults(1)
                .getSingleResult();
    }

    public void criar(
            UUID id,
            UUID pedido,
            UUID conexao,
            String valor,
            Instant agora,
            String retorno,
            int prazo) {
        em.createNativeQuery(
                        "insert into"
                            + " pagamento_checkout(id,pedido_id,conexao_id,valor,estado,criado_em,proximo_em,retorno_url,prazo_segundos)"
                            + " values (:id,:p,:c,:v,'SOLICITADO',:agora,:agora,:retorno,:prazo)")
                .setParameter("id", id)
                .setParameter("p", pedido)
                .setParameter("c", conexao)
                .setParameter("v", new BigDecimal(valor))
                .setParameter("agora", agora)
                .setParameter("retorno", retorno)
                .setParameter("prazo", prazo)
                .executeUpdate();
    }

    public List<CheckoutResumo> listar(UUID pedido) {
        return query(
                        "select id,estado,checkout_url,ultima_falha from pagamento_checkout where"
                            + " pedido_id=:id order by criado_em desc,id",
                        Object[].class)
                .setParameter("id", pedido)
                .getResultStream()
                .map(
                        r ->
                                new CheckoutResumo(
                                        (UUID) r[0], (String) r[1], (String) r[2], (String) r[3]))
                .toList();
    }

    public List<CheckoutRegistro> bloquearTentativas(UUID pedido) {
        var ids =
                query(
                                "select id from pagamento_checkout where pedido_id=:p order by id for update",
                                UUID.class)
                        .setParameter("p", pedido)
                        .getResultList();
        return ids.stream().map(id -> obter(id, false)).toList();
    }

    public void substituirRecusadas(UUID pedido) {
        em.createNativeQuery(
                        "update pagamento_checkout set substituida=true where pedido_id=:p"
                                + " and estado='RECUSADO' and not substituida")
                .setParameter("p", pedido)
                .executeUpdate();
    }

    public CheckoutRegistro obter(UUID id, boolean lock) {
        return query(
                        "select"
                            + " id,pedido_id,conexao_id,valor,externo_id,checkout_url,estado,criado_em,lease_id,enviado,retorno_url,prazo_segundos,substituida"
                            + " from pagamento_checkout where id=:id"
                                + (lock ? " for update" : ""),
                        Object[].class)
                .setParameter("id", id)
                .getResultStream()
                .findFirst()
                .map(this::checkout)
                .orElseThrow(ErrosPedido::inexistente);
    }

    public CheckoutRegistro reivindicar() {
        em.createNativeQuery(
                        "update pagamento_checkout set"
                            + " estado='BLOQUEADO',ultima_falha='LeaseExpirada',lease_id=null,lease_ate=null"
                            + " where tentativas>=5 and lease_ate<=now() and estado<>'BLOQUEADO'")
                .executeUpdate();
        var id =
                query(
                                "select id from pagamento_checkout where estado in"
                                    + " ('SOLICITADO','AGUARDANDO','EM_RECONCILIACAO') and"
                                    + " tentativas<5 and proximo_em<=now() and (lease_ate is null"
                                    + " or lease_ate<=now()) order by proximo_em,id for update skip"
                                    + " locked",
                                UUID.class)
                        .setMaxResults(1)
                        .getResultStream()
                        .findFirst();
        if (id.isEmpty()) return null;
        UUID lease = UUID.randomUUID();
        em.createNativeQuery(
                        "update pagamento_checkout set lease_id=:l,lease_ate=now()+interval '2"
                            + " minutes',tentativas=tentativas+1 where id=:id")
                .setParameter("l", lease)
                .setParameter("id", id.get())
                .executeUpdate();
        return obter(id.get(), false);
    }

    public boolean possuiLease(CheckoutRegistro trabalho) {
        return query(
                        "select exists(select 1 from pagamento_checkout where id=:id and"
                            + " lease_id=:l and lease_ate>now())",
                        Boolean.class)
                .setParameter("id", trabalho.id())
                .setParameter("l", trabalho.leaseId())
                .getSingleResult();
    }

    public void concluir(CheckoutRegistro c, String externo, String url, String estado) {
        em.createNativeQuery(
                        "update pagamento_checkout set"
                            + " externo_id=:e,checkout_url=:u,estado=:estado,lease_id=null,lease_ate=null,tentativas=0,ultima_falha=null,proximo_em=now()+interval"
                            + " '15 seconds' where id=:id and lease_id=:l")
                .setParameter("e", externo)
                .setParameter("u", url)
                .setParameter("estado", estado)
                .setParameter("id", c.id())
                .setParameter("l", c.leaseId())
                .executeUpdate();
    }

    public void falhar(CheckoutRegistro c, String tipo) {
        em.createNativeQuery(
                        "update pagamento_checkout set estado=case when tentativas>=5 then"
                            + " 'BLOQUEADO' else 'EM_RECONCILIACAO'"
                            + " end,lease_id=null,lease_ate=null,ultima_falha=:tipo,proximo_em=now()+tentativas*interval"
                            + " '30 seconds' where id=:id and lease_id=:l")
                .setParameter("tipo", tipo)
                .setParameter("id", c.id())
                .setParameter("l", c.leaseId())
                .executeUpdate();
    }

    public void marcarEnviado(CheckoutRegistro c) {
        int n =
                em.createNativeQuery(
                                "update pagamento_checkout set enviado=true where id=:id and"
                                    + " lease_id=:l and lease_ate>now() and not substituida and not enviado")
                        .setParameter("id", c.id())
                        .setParameter("l", c.leaseId())
                        .executeUpdate();
        if (n != 1)
            throw ErrosPedido.conflito(
                    "A tentativa financeira perdeu sua reserva de processamento.");
    }

    public void mapear(String externo, UUID empresa) {
        externo = externo.toLowerCase(Locale.ROOT);
        em.createNativeQuery(
                        "insert into public.mp_recurso(recurso,empresa_id) values (:id,:e) on"
                            + " conflict(recurso) do nothing")
                .setParameter("id", externo)
                .setParameter("e", empresa)
                .executeUpdate();
        UUID dono =
                query("select empresa_id from public.mp_recurso where recurso=:id", UUID.class)
                        .setParameter("id", externo)
                        .getSingleResult();
        if (!dono.equals(empresa))
            throw ErrosPedido.conflito("A referência financeira pertence a outra conta.");
    }

    public void reconciliar(UUID id) {
        em.createNativeQuery(
                        "update pagamento_checkout set"
                            + " estado='EM_RECONCILIACAO',tentativas=0,proximo_em=now() where"
                            + " id=:id and lease_id is null")
                .setParameter("id", id)
                .executeUpdate();
    }

    private CheckoutRegistro checkout(Object[] r) {
        return new CheckoutRegistro(
                (UUID) r[0],
                (UUID) r[1],
                (UUID) r[2],
                ((BigDecimal) r[3]).toPlainString(),
                (String) r[4],
                (String) r[5],
                (String) r[6],
                instante(r[7]),
                (UUID) r[8],
                (Boolean) r[9],
                (String) r[10],
                r[11] == null ? null : ((Number) r[11]).intValue(),
                (Boolean) r[12]);
    }

    private Instant instante(Object v) {
        if (v instanceof Instant i) return i;
        if (v instanceof OffsetDateTime i) return i.toInstant();
        return ((Timestamp) v).toInstant();
    }

    private <T> NativeQuery<T> query(String sql, Class<T> tipo) {
        return em.unwrap(Session.class).createNativeQuery(sql, tipo);
    }
}
