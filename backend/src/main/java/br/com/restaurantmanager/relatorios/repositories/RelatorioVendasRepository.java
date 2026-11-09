package br.com.restaurantmanager.relatorios.repositories;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.UUID;

/** Projeção somente de leitura; agrega fatos dos domínios sem executar suas mutações. */
@Repository
public class RelatorioVendasRepository {
    private final EntityManager em;

    public RelatorioVendasRepository(EntityManager em) {
        this.em = em;
    }

    public Object[] consultar(UUID unidade, Instant inicio, Instant fim) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        """
with pedidos_periodo as (select id,estado from pedido where unidade_id=:u and criado_em>=:i and criado_em<:f),
cobrancas_periodo as (select distinct cobranca_id from cobranca_parcela where pedido_id in(select id from pedidos_periodo)),
saldos as (select c.id,c.pago_confirmado-c.devolvido_confirmado liquido,
    coalesce((select sum(p.original-p.abatido) from cobranca_parcela p where p.cobranca_id=c.id),0) devido
    from cobranca c where c.id in(select cobranca_id from cobrancas_periodo))
select
    (select count(*) from pedidos_periodo),
    (select count(*) from pedidos_periodo where estado='CANCELADO'),
    (select coalesce(sum(original),0) from cobranca_parcela where pedido_id in(select id from pedidos_periodo)),
    (select coalesce(sum(a.valor),0) from ajuste_cobranca a join cobranca_parcela p on p.id=a.parcela_id
        join cobranca c on c.id=p.cobranca_id where c.unidade_id=:u and a.criado_em>=:i and a.criado_em<:f),
    (select coalesce(sum(r.valor),0) from recebimento r join cobranca c on c.id=r.cobranca_id
        where c.unidade_id=:u and r.confirmado_em>=:i and r.confirmado_em<:f),
    (select coalesce(sum(d.valor),0) from devolucao d join cobranca c on c.id=d.cobranca_id
        where c.unidade_id=:u and d.estado='CONFIRMADA' and d.confirmada_em>=:i and d.confirmada_em<:f),
    (select coalesce(sum(greatest(devido-liquido,0)),0) from saldos),
    (select coalesce(sum(greatest(liquido-devido,0)),0) from saldos),
    (select coalesce(sum(d.valor),0) from devolucao d where d.estado<>'CONFIRMADA'
        and d.cobranca_id in(select cobranca_id from cobrancas_periodo))
""",
                        Object[].class)
                .setParameter("u", unidade)
                .setParameter("i", inicio)
                .setParameter("f", fim)
                .getSingleResult();
    }
}
