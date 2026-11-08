package br.com.restaurantmanager.financeiro.repositories;

import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.Session;
import org.hibernate.query.NativeQuery;
import org.springframework.stereotype.Repository;

@Repository
public class CobrancaRepository {
    private final EntityManager em;

    public CobrancaRepository(EntityManager em) {
        this.em = em;
    }

    public UUID obterOuCriar(UUID unidade, UUID pedido, UUID comanda) {
        var existente = localizar(pedido, comanda);
        if (existente.isPresent()) return existente.get();
        UUID id = UUID.randomUUID();
        em.createNativeQuery("insert into cobranca(id,unidade_id,pedido_id,comanda_id) values (:id,:unidade,:pedido,:comanda)")
                .setParameter("id", id).setParameter("unidade", unidade)
                .setParameter("pedido", comanda == null ? pedido : null).setParameter("comanda", comanda).executeUpdate();
        return id;
    }

    public Optional<UUID> localizar(UUID pedido, UUID comanda) {
        String coluna = comanda == null ? "pedido_id" : "comanda_id";
        return consulta("select id from cobranca where " + coluna + "=:id", UUID.class)
                .setParameter("id", comanda == null ? pedido : comanda).getResultStream().findFirst();
    }

    public Object[] saldo(UUID id, boolean lock) {
        Object[] dinheiro = consulta("select pago_confirmado,devolvido_confirmado,pendencia_financeira from cobranca where id=:id"
                + (lock ? " for update" : ""), Object[].class).setParameter("id", id).getSingleResult();
        BigDecimal devido = consulta("select coalesce(sum(original-abatido),0) from cobranca_parcela where cobranca_id=:id", BigDecimal.class)
                .setParameter("id", id).getSingleResult();
        return new Object[]{devido, dinheiro[0], dinheiro[1], dinheiro[2]};
    }

    public void parcela(UUID cobranca, UUID pedido, UUID unidade, BigDecimal valor) {
        em.createNativeQuery("""
                insert into cobranca_parcela(id,cobranca_id,pedido_id,unidade_producao_id,tipo,original)
                values (:id,:cobranca,:pedido,:unidade,:tipo,:valor)
                """).setParameter("id", UUID.randomUUID()).setParameter("cobranca", cobranca)
                .setParameter("pedido", pedido).setParameter("unidade", unidade)
                .setParameter("tipo", unidade == null ? "TAXA" : "UNIDADE").setParameter("valor", valor).executeUpdate();
    }

    public void cancelar(UUID pedido, List<UUID> unidades, boolean integral, UUID intencao, String motivo, Instant agora) {
        var parcelas = consulta("select id,unidade_producao_id,tipo,original-abatido from cobranca_parcela where pedido_id=:id order by id for update", Object[].class)
                .setParameter("id", pedido).getResultList();
        for (Object[] parcela : parcelas) {
            boolean selecionada = unidades.contains((UUID) parcela[1]) || (integral && "TAXA".equals(parcela[2]));
            BigDecimal remanescente = (BigDecimal) parcela[3];
            if (!selecionada || remanescente.signum() == 0) continue;
            em.createNativeQuery("update cobranca_parcela set abatido=original where id=:id")
                    .setParameter("id", parcela[0]).executeUpdate();
            em.createNativeQuery("""
                    insert into ajuste_cobranca(id,intencao_id,parcela_id,valor,motivo,criado_em)
                    values (:id,:intencao,:parcela,:valor,:motivo,:agora)
                    """).setParameter("id", UUID.randomUUID()).setParameter("intencao", intencao)
                    .setParameter("parcela", parcela[0]).setParameter("valor", remanescente)
                    .setParameter("motivo", motivo).setParameter("agora", agora).executeUpdate();
        }
    }

    private <T> NativeQuery<T> consulta(String sql, Class<T> tipo) {
        return em.unwrap(Session.class).createNativeQuery(sql, tipo);
    }
}
