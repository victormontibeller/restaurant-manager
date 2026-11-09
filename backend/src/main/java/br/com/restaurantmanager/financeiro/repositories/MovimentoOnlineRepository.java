package br.com.restaurantmanager.financeiro.repositories;

import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Repository
public class MovimentoOnlineRepository {
    private final EntityManager em;

    public MovimentoOnlineRepository(EntityManager em) {
        this.em = em;
    }

    public List<String> reembolsosConhecidos(UUID checkout) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select externo_id from devolucao where checkout_id=:id and externo_id is"
                            + " not null",
                        String.class)
                .setParameter("id", checkout)
                .getResultList();
    }

    public void receber(UUID cobranca, UUID checkout, String transacao, BigDecimal valor) {
        UUID id =
                UUID.nameUUIDFromBytes(
                        ("MERCADOPAGO:" + transacao).getBytes(StandardCharsets.UTF_8));
        var anterior =
                em.unwrap(Session.class)
                        .createNativeQuery(
                                "select cobranca_id,checkout_id,valor from recebimento where"
                                    + " transacao_externa=:t",
                                Object[].class)
                        .setParameter("t", transacao)
                        .getResultStream()
                        .findFirst();
        if (anterior.isPresent()) {
            Object[] r = anterior.get();
            if (!cobranca.equals(r[0])
                    || !checkout.equals(r[1])
                    || valor.compareTo((BigDecimal) r[2]) != 0)
                throw ErrosPedido.conflito("Referência de pagamento divergente.");
            return;
        }
        intencao(id, cobranca, "RECEBER_ONLINE");
        em.createNativeQuery(
                        "insert into"
                            + " recebimento(id,cobranca_id,metodo,valor,entregue,checkout_id,transacao_externa)"
                            + " values (:id,:c,'ONLINE',:v,:v,:p,:t)")
                .setParameter("id", id)
                .setParameter("c", cobranca)
                .setParameter("v", valor)
                .setParameter("p", checkout)
                .setParameter("t", transacao)
                .executeUpdate();
        em.createNativeQuery("update cobranca set pago_confirmado=pago_confirmado+:v where id=:c")
                .setParameter("v", valor)
                .setParameter("c", cobranca)
                .executeUpdate();
    }

    public List<UUID> reservarExcedente(UUID cobranca, BigDecimal excedente) {
        var criadas = new ArrayList<UUID>();
        BigDecimal reservado =
                em.unwrap(Session.class)
                        .createNativeQuery(
                                "select coalesce(sum(valor),0) from devolucao where cobranca_id=:c"
                                    + " and estado<>'CONFIRMADA'",
                                BigDecimal.class)
                        .setParameter("c", cobranca)
                        .getSingleResult();
        BigDecimal restante = excedente.subtract(reservado);
        if (restante.signum() <= 0) return criadas;
        var recebimentos =
                em.unwrap(Session.class)
                        .createNativeQuery(
                                """
select r.id,r.checkout_id,r.valor-coalesce((select sum(d.valor) from devolucao d where d.recebimento_id=r.id),0)
from recebimento r where r.cobranca_id=:c and r.metodo='ONLINE' order by r.confirmado_em,r.id
""",
                                Object[].class)
                        .setParameter("c", cobranca)
                        .getResultList();
        for (Object[] r : recebimentos) {
            BigDecimal valor = restante.min((BigDecimal) r[2]);
            if (valor.signum() <= 0) continue;
            UUID id = UUID.randomUUID();
            intencao(id, cobranca, "DEVOLVER_AUTOMATICO");
            em.createNativeQuery(
                            "insert into"
                                + " devolucao(id,cobranca_id,recebimento_id,valor,motivo,estado,checkout_id)"
                                + " values (:id,:c,:r,:v,'Excedente após confirmação ou ajuste de"
                                + " cobrança.','SOLICITADA',:p)")
                    .setParameter("id", id)
                    .setParameter("c", cobranca)
                    .setParameter("r", r[0])
                    .setParameter("v", valor)
                    .setParameter("p", r[1])
                    .executeUpdate();
            em.createNativeQuery("update cobranca set pendencia_financeira=true where id=:id")
                    .setParameter("id", cobranca)
                    .executeUpdate();
            criadas.add(id);
            restante = restante.subtract(valor);
            if (restante.signum() <= 0) break;
        }
        return criadas;
    }

    public Object[] contextoEvento(UUID cobranca) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select p.unidade_id,p.id,p.usuario_id from cobranca c join pedido p on"
                            + " p.id=c.pedido_id where c.id=:id",
                        Object[].class)
                .setParameter("id", cobranca)
                .getSingleResult();
    }

    private void intencao(UUID id, UUID cobranca, String acao) {
        em.createNativeQuery(
                        "insert into financeiro_intencao(id,cobranca_id,ator_id,acao,payload)"
                            + " values (:id,:c,null,:a,'{}')")
                .setParameter("id", id)
                .setParameter("c", cobranca)
                .setParameter("a", acao)
                .executeUpdate();
    }
}
