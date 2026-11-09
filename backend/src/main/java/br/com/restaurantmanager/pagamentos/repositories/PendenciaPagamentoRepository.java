package br.com.restaurantmanager.pagamentos.repositories;

import br.com.restaurantmanager.pagamentos.dtos.PendenciaPagamento;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public class PendenciaPagamentoRepository {
    private final EntityManager em;

    public PendenciaPagamentoRepository(EntityManager em) {
        this.em = em;
    }

    public List<PendenciaPagamento> listar(UUID unidade, int pagina) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        """
select id,pedido_id,tipo,estado from (
    select c.id,c.pedido_id,'CHECKOUT' tipo,c.estado,c.criado_em from pagamento_checkout c join pedido p on p.id=c.pedido_id
    where p.unidade_id=:u and c.estado in ('SOLICITADO','AGUARDANDO','EM_RECONCILIACAO','BLOQUEADO')
    union all
    select d.id,c.pedido_id,'DEVOLUCAO' tipo,d.estado,d.criada_em from devolucao d join pagamento_checkout c on c.id=d.checkout_id
    join pedido p on p.id=c.pedido_id where p.unidade_id=:u and d.estado<>'CONFIRMADA'
) fila order by criado_em,id
""",
                        Object[].class)
                .setParameter("u", unidade)
                .setFirstResult(pagina * 50)
                .setMaxResults(50)
                .getResultStream()
                .map(
                        r ->
                                new PendenciaPagamento(
                                        (UUID) r[0], (UUID) r[1], (String) r[2], (String) r[3]))
                .toList();
    }

    public UUID pedido(UUID id, boolean devolucao) {
        String sql =
                devolucao
                        ? "select c.pedido_id from devolucao d join pagamento_checkout c on"
                              + " c.id=d.checkout_id where d.id=:id"
                        : "select pedido_id from pagamento_checkout where id=:id";
        return em.unwrap(Session.class)
                .createNativeQuery(sql, UUID.class)
                .setParameter("id", id)
                .getResultStream()
                .findFirst()
                .orElseThrow(ErrosPedido::inexistente);
    }

    public void reconciliar(UUID id, boolean devolucao) {
        String tabela = devolucao ? "devolucao" : "pagamento_checkout";
        String filtro = devolucao ? " and estado<>'CONFIRMADA'" : "";
        em.createNativeQuery(
                        "update "
                                + tabela
                                + " set estado='EM_RECONCILIACAO',tentativas=0,proximo_em=now(),lease_id=null,lease_ate=null"
                                + " where id=:id and (lease_id is null or lease_ate<=now())"
                                + filtro)
                .setParameter("id", id)
                .executeUpdate();
    }
}
