package br.com.restaurantmanager.financeiro.repositories;

import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.financeiro.dtos.Devolucao;
import br.com.restaurantmanager.financeiro.dtos.ParcelaCobranca;
import br.com.restaurantmanager.financeiro.dtos.Recebimento;
import br.com.restaurantmanager.financeiro.dtos.ReferenciaCobranca;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.hibernate.query.NativeQuery;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public class MovimentoFinanceiroRepository {
    private final EntityManager em;
    private final ObjectMapper mapper;

    public MovimentoFinanceiroRepository(EntityManager em, ObjectMapper mapper) {
        this.em = em;
        this.mapper = mapper;
    }

    public ReferenciaCobranca referencia(UUID recurso, boolean comanda) {
        return query(
                        "select id,unidade_id,pedido_id,comanda_id from cobranca where "
                                + (comanda ? "comanda_id" : "pedido_id")
                                + "=:id",
                        Object[].class)
                .setParameter("id", recurso)
                .getResultStream()
                .map(
                        r ->
                                new ReferenciaCobranca(
                                        (UUID) r[0], (UUID) r[1], (UUID) r[2], (UUID) r[3]))
                .findFirst()
                .orElseThrow(ErrosPedido::inexistente);
    }

    public void bloquearIntencao(UUID id) {
        query("select 1 from pg_advisory_xact_lock(hashtextextended(:id,3))", Integer.class)
                .setParameter("id", id.toString())
                .getSingleResult();
    }

    public boolean repetida(UUID id, UUID cobranca, UUID ator, String acao, Object body) {
        var anterior =
                query(
                                "select cobranca_id,ator_id,acao,payload from financeiro_intencao"
                                        + " where id=:id",
                                Object[].class)
                        .setParameter("id", id)
                        .getResultStream()
                        .findFirst();
        if (anterior.isEmpty()) return false;
        Object[] r = anterior.get();
        if (!cobranca.equals(r[0])
                || !ator.equals(r[1])
                || !acao.equals(r[2])
                || !mapper.writeValueAsString(body).equals(r[3])) {
            throw ErrosPedido.conflito("Esta intenção já foi utilizada com outros dados.");
        }
        return true;
    }

    public void intencao(UUID id, UUID cobranca, UUID ator, String acao, Object body) {
        em.createNativeQuery(
                        "insert into financeiro_intencao(id,cobranca_id,ator_id,acao,payload)"
                                + " values (:id,:c,:a,:acao,:p)")
                .setParameter("id", id)
                .setParameter("c", cobranca)
                .setParameter("a", ator)
                .setParameter("acao", acao)
                .setParameter("p", mapper.writeValueAsString(body))
                .executeUpdate();
    }

    public List<ParcelaCobranca> parcelas(UUID cobranca) {
        return query(
                        """
select c.id,c.pedido_id,c.unidade_producao_id,c.tipo,c.original,c.abatido,
  case when c.tipo='TAXA' then 'Taxa de entrega'
  else coalesce(linha.nome,'Item do pedido')
    || case when linha.posicao is null then '' else ' · item ' || linha.posicao end
    || case when u.ordinal is null then '' else ' · unidade ' || u.ordinal end end
from cobranca_parcela c
left join unidade_producao u on u.id=c.unidade_producao_id
left join pedido p on p.id=c.pedido_id
left join lateral (
  select item->>'nome' as nome,posicao
  from jsonb_array_elements(p.linhas) with ordinality as s(item,posicao)
  where item->>'id'=cast(u.linha_id as text)
) linha on true
where c.cobranca_id=:c order by c.id
""",
                        Object[].class)
                .setParameter("c", cobranca)
                .getResultStream()
                .map(
                        r ->
                                new ParcelaCobranca(
                                        (UUID) r[0],
                                        (UUID) r[1],
                                        (UUID) r[2],
                                        (String) r[3],
                                        Dinheiro.texto((BigDecimal) r[4]),
                                        Dinheiro.texto((BigDecimal) r[5]),
                                        (String) r[6]))
                .toList();
    }

    public List<Recebimento> recebimentos(UUID cobranca) {
        return query(
                        "select id,metodo,valor,entregue,confirmado_em from recebimento where"
                                + " cobranca_id=:c order by confirmado_em,id",
                        Object[].class)
                .setParameter("c", cobranca)
                .getResultStream()
                .map(
                        r ->
                                new Recebimento(
                                        (UUID) r[0],
                                        (String) r[1],
                                        Dinheiro.texto((BigDecimal) r[2]),
                                        Dinheiro.texto((BigDecimal) r[3]),
                                        Dinheiro.texto(
                                                ((BigDecimal) r[3]).subtract((BigDecimal) r[2])),
                                        instante(r[4])))
                .toList();
    }

    public List<Devolucao> devolucoes(UUID cobranca) {
        return query(
                        "select id,recebimento_id,valor,motivo,estado,criada_em,confirmada_em from"
                                + " devolucao where cobranca_id=:c order by criada_em,id",
                        Object[].class)
                .setParameter("c", cobranca)
                .getResultStream()
                .map(
                        r ->
                                new Devolucao(
                                        (UUID) r[0],
                                        (UUID) r[1],
                                        Dinheiro.texto((BigDecimal) r[2]),
                                        (String) r[3],
                                        (String) r[4],
                                        instante(r[5]),
                                        instante(r[6])))
                .toList();
    }

    public BigDecimal reservado(UUID cobranca) {
        return query(
                        "select coalesce(sum(valor),0) from devolucao where cobranca_id=:c and"
                                + " estado<>'CONFIRMADA'",
                        BigDecimal.class)
                .setParameter("c", cobranca)
                .getSingleResult();
    }

    public void receber(
            UUID id, UUID cobranca, String metodo, BigDecimal valor, BigDecimal entregue) {
        em.createNativeQuery(
                        "insert into recebimento(id,cobranca_id,metodo,valor,entregue) values"
                                + " (:id,:c,:m,:v,:e)")
                .setParameter("id", id)
                .setParameter("c", cobranca)
                .setParameter("m", metodo)
                .setParameter("v", valor)
                .setParameter("e", entregue)
                .executeUpdate();
        em.createNativeQuery("update cobranca set pago_confirmado=pago_confirmado+:v where id=:c")
                .setParameter("v", valor)
                .setParameter("c", cobranca)
                .executeUpdate();
    }

    public void ajustar(UUID id, UUID parcela, BigDecimal valor, String motivo) {
        em.createNativeQuery("update cobranca_parcela set abatido=abatido+:v where id=:p")
                .setParameter("v", valor)
                .setParameter("p", parcela)
                .executeUpdate();
        em.createNativeQuery(
                        "insert into"
                            + " ajuste_cobranca(id,intencao_id,parcela_id,valor,motivo,criado_em)"
                            + " values (:id,:i,:p,:v,:m,now())")
                .setParameter("id", UUID.randomUUID())
                .setParameter("i", id)
                .setParameter("p", parcela)
                .setParameter("v", valor)
                .setParameter("m", motivo)
                .executeUpdate();
    }

    public void devolver(
            UUID id, UUID cobranca, UUID recebimento, BigDecimal valor, String motivo) {
        em.createNativeQuery(
                        "insert into"
                            + " devolucao(id,cobranca_id,recebimento_id,valor,motivo,estado,checkout_id)"
                            + " select :id,:c,:r,:v,:m,'SOLICITADA',checkout_id from recebimento"
                            + " where id=:r")
                .setParameter("id", id)
                .setParameter("c", cobranca)
                .setParameter("r", recebimento)
                .setParameter("v", valor)
                .setParameter("m", motivo)
                .executeUpdate();
        em.createNativeQuery("update cobranca set pendencia_financeira=true where id=:c")
                .setParameter("c", cobranca)
                .executeUpdate();
    }

    public void confirmar(UUID id, UUID cobranca, BigDecimal valor) {
        em.createNativeQuery(
                        "update devolucao set estado='CONFIRMADA',confirmada_em=now() where id=:id")
                .setParameter("id", id)
                .executeUpdate();
        em.createNativeQuery(
                        "update cobranca set"
                            + " devolvido_confirmado=devolvido_confirmado+:v,pendencia_financeira=exists(select"
                            + " 1 from devolucao where cobranca_id=:c and estado<>'CONFIRMADA')"
                            + " where id=:c")
                .setParameter("v", valor)
                .setParameter("c", cobranca)
                .executeUpdate();
    }

    private Instant instante(Object valor) {
        if (valor == null) return null;
        if (valor instanceof Instant i) return i;
        if (valor instanceof OffsetDateTime i) return i.toInstant();
        return ((Timestamp) valor).toInstant();
    }

    private <T> NativeQuery<T> query(String sql, Class<T> tipo) {
        return em.unwrap(Session.class).createNativeQuery(sql, tipo);
    }
}
