package br.com.restaurantmanager.pagamentos.repositories;

import br.com.restaurantmanager.catalogo.dtos.Pagina;
import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.pagamentos.dtos.PendenciaPagamento;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.shared.InstantesSql;

import jakarta.persistence.EntityManager;
import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.UUID;

@Repository
public class PendenciaPagamentoRepository {
    private final EntityManager em;

    public PendenciaPagamentoRepository(EntityManager em) {
        this.em = em;
    }

    public Pagina<PendenciaPagamento> listar(UUID unidade, int pagina, String tipo, String estado) {
        String sql = """
                with fila as (
                    select c.id,c.pedido_id,'CHECKOUT' tipo,c.estado,c.criado_em,c.valor,c.tentativas,
                           c.proximo_em,c.ultima_falha,c.lease_ate,c.substituida,c.enviado,
                           cast(null as uuid) recebimento_id
                    from pagamento_checkout c join pedido p on p.id=c.pedido_id
                    where p.unidade_id=:u and c.estado in ('SOLICITADO','AGUARDANDO','EM_RECONCILIACAO','BLOQUEADO')
                    union all
                    select d.id,c.pedido_id,'DEVOLUCAO',d.estado,d.criada_em,d.valor,d.tentativas,
                           d.proximo_em,d.ultima_falha,d.lease_ate,null,null,d.recebimento_id
                    from devolucao d join pagamento_checkout c on c.id=d.checkout_id
                    join pedido p on p.id=c.pedido_id where p.unidade_id=:u and d.estado<>'CONFIRMADA'
                )
                select f.id,f.pedido_id,f.tipo,f.estado,f.criado_em,f.valor,f.tentativas,
                       case when f.estado not in ('BLOQUEADO','FALHOU') and f.tentativas<5
                            and (f.lease_ate is null or f.lease_ate<=now()) then f.proximo_em end proxima,
                       f.ultima_falha is not null falhou, coalesce(f.lease_ate>now(),false) em_execucao,
                       f.substituida,f.enviado,f.recebimento_id,p.canal,p.estado estado_pedido,u.fuso
                from fila f join pedido p on p.id=f.pedido_id join unidade u on u.id=p.unidade_id
                where (cast(:tipo as text) is null or f.tipo=:tipo) and (cast(:estado as text) is null or f.estado=:estado)
                order by f.criado_em,f.id,f.tipo
                """;
        var linhas = em.unwrap(Session.class).createNativeQuery(sql, Object[].class)
                .setParameter("u", unidade).setParameter("tipo", tipo).setParameter("estado", estado)
                .setFirstResult(pagina * 50).setMaxResults(51).getResultList();
        var itens = linhas.stream().limit(50).map(r -> new PendenciaPagamento(
                (UUID) r[0], (UUID) r[1], (String) r[2], (String) r[3], InstantesSql.ler(r[4]),
                Dinheiro.texto((BigDecimal) r[5]), ((Number) r[6]).intValue(), InstantesSql.ler(r[7]),
                (boolean) r[8], (boolean) r[9], (Boolean) r[10], (Boolean) r[11], (UUID) r[12],
                (String) r[13], (String) r[14], (String) r[15])).toList();
        return new Pagina<>(itens, linhas.size() > 50);
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
        String filtro = devolucao ? " and estado<>'CONFIRMADA'" : " and estado<>'CONFIRMADO'";
        int alterados = em.createNativeQuery(
                        "update "
                                + tabela
                                + " set estado='EM_RECONCILIACAO',tentativas=0,proximo_em=now(),lease_id=null,lease_ate=null"
                                + " where id=:id and (lease_id is null or lease_ate<=now())"
                                + filtro)
                .setParameter("id", id)
                .executeUpdate();
        if (alterados == 0) throw ErrosPedido.conflito("Operação já concluída ou em processamento. Atualize a fila.");
    }
}
