package br.com.restaurantmanager.relatorios.repositories;

import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.relatorios.dtos.DiaFinanceiro;
import br.com.restaurantmanager.relatorios.dtos.MovimentoRelatorio;
import br.com.restaurantmanager.relatorios.dtos.VendasPorCanal;
import br.com.restaurantmanager.shared.InstantesSql;

import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.hibernate.query.NativeQuery;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Projeção somente de leitura; agrega fatos dos domínios sem executar suas mutações. */
@Repository
public class RelatorioVendasRepository {
    private final EntityManager em;

    public RelatorioVendasRepository(EntityManager em) {
        this.em = em;
    }

    public static final int TAMANHO_PAGINA = 25;

    // Cada linha representa um fato financeiro. Uma cobrança de comanda pode reunir várias rodadas.
    private static final String MOVIMENTOS = """
            with movimentos as (
                select r.id, r.confirmado_em instante, 'RECEBIMENTO' tipo, r.valor, r.metodo,
                       c.pedido_id, c.comanda_id, r.entregue, r.entregue-r.valor troco,
                       cast(null as uuid) recebimento_id
                from recebimento r join cobranca c on c.id=r.cobranca_id
                where c.unidade_id=:u and r.confirmado_em>=:i and r.confirmado_em<:f
                union all
                select d.id, d.confirmada_em, 'DEVOLUCAO', d.valor, r.metodo,
                       c.pedido_id, c.comanda_id, null, null, r.id
                from devolucao d join cobranca c on c.id=d.cobranca_id
                join recebimento r on r.id=d.recebimento_id and r.cobranca_id=d.cobranca_id
                where c.unidade_id=:u and d.estado='CONFIRMADA' and d.confirmada_em>=:i and d.confirmada_em<:f
                union all
                select a.id, a.criado_em, 'AJUSTE', a.valor, null, p.pedido_id, c.comanda_id, null, null, null
                from ajuste_cobranca a join cobranca_parcela p on p.id=a.parcela_id
                join cobranca c on c.id=p.cobranca_id
                where c.unidade_id=:u and a.criado_em>=:i and a.criado_em<:f
            )
            """;

    public List<DiaFinanceiro> dias(UUID unidade, Instant inicio, Instant fim, String fuso) {
        return consulta(MOVIMENTOS + """
                select cast(cast(timezone(:fuso,instante) as date) as text) dia,
                       coalesce(sum(valor) filter(where tipo='RECEBIMENTO'),0) recebido,
                       coalesce(sum(valor) filter(where tipo='DEVOLUCAO'),0) devolvido,
                       coalesce(sum(valor) filter(where tipo='AJUSTE'),0) ajustes
                from movimentos group by dia order by dia desc
                """, unidade, inicio, fim).setParameter("fuso", fuso).getResultList().stream()
                .map(r -> new DiaFinanceiro(LocalDate.parse((String) r[0]), moeda(r[1]), moeda(r[2]), moeda(r[3])))
                .toList();
    }

    public List<VendasPorCanal> canais(UUID unidade, Instant inicio, Instant fim) {
        return consulta("""
                with vendas as (
                    select p.id, p.canal, p.estado, coalesce(sum(cp.original),0) original
                    from pedido p left join cobranca_parcela cp on cp.pedido_id=p.id
                    where p.unidade_id=:u and p.criado_em>=:i and p.criado_em<:f
                    group by p.id, p.canal, p.estado
                )
                select canal, count(*) pedidos, count(*) filter(where estado='CANCELADO') cancelados, sum(original) total
                from vendas group by canal order by pedidos desc, canal
                """, unidade, inicio, fim).getResultList().stream()
                .map(r -> new VendasPorCanal((String) r[0], ((Number) r[1]).longValue(), ((Number) r[2]).longValue(), moeda(r[3])))
                .toList();
    }

    public List<MovimentoRelatorio> movimentos(UUID unidade, Instant inicio, Instant fim, int pagina) {
        return consulta(MOVIMENTOS + """
                select mov.id, mov.instante, mov.tipo, mov.valor, mov.metodo, mov.pedido_id, mov.comanda_id,
                       m.nome, coalesce(p.canal,'MESA') canal, mov.entregue, mov.troco, mov.recebimento_id
                from movimentos mov left join pedido p on p.id=mov.pedido_id
                left join comanda c on c.id=mov.comanda_id
                left join atendimento a on a.id=c.atendimento_id left join mesa m on m.id=a.mesa_id
                order by mov.instante desc, mov.tipo, mov.id
                """, unidade, inicio, fim)
                .setFirstResult(pagina * TAMANHO_PAGINA).setMaxResults(TAMANHO_PAGINA + 1)
                .getResultList().stream()
                .map(r -> new MovimentoRelatorio((UUID) r[0], InstantesSql.ler(r[1]), (String) r[2], moeda(r[3]),
                        (String) r[4], (UUID) r[5], (UUID) r[6], (String) r[7], (String) r[8],
                        moeda(r[9]), moeda(r[10]), (UUID) r[11]))
                .toList();
    }

    private NativeQuery<Object[]> consulta(String sql, UUID unidade, Instant inicio, Instant fim) {
        return em.unwrap(Session.class).createNativeQuery(sql, Object[].class)
                .setParameter("u", unidade).setParameter("i", inicio).setParameter("f", fim);
    }

    private static String moeda(Object valor) {
        return valor == null ? null : Dinheiro.texto((BigDecimal) valor);
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
