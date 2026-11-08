package br.com.restaurantmanager.pedidos.repositories;

import br.com.restaurantmanager.pedidos.dtos.TrabalhoDeadline;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.hibernate.Session;
import org.springframework.stereotype.Repository;

@Repository
public class PedidoDeadlineRepository {
    private final EntityManager em;

    public PedidoDeadlineRepository(EntityManager em) {
        this.em = em;
    }

    public void agendar(UUID pedido, Instant proximo) {
        em.createNativeQuery("insert into pedido_deadline_trabalho(pedido_id,proximo_em) values (:pedido,:proximo)")
                .setParameter("pedido", pedido).setParameter("proximo", proximo).executeUpdate();
    }

    public Optional<TrabalhoDeadline> reivindicar(Instant agora) {
        // Uma queda na última tentativa não pode deixar um trabalho invisível
        // entre a lease vencida e o limite de retries.
        em.createNativeQuery("""
                update pedido_deadline_trabalho set bloqueado=true,lease_id=null,lease_ate=null,
                ultima_falha='LeaseExpirado' where not bloqueado and tentativas>=5
                and lease_ate<=:agora
                """).setParameter("agora", agora).executeUpdate();
        var proximo = em.unwrap(Session.class).createNativeQuery("""
                select pedido_id from pedido_deadline_trabalho where not bloqueado and tentativas<5
                and proximo_em<=:agora and (lease_ate is null or lease_ate<=:agora)
                order by proximo_em,pedido_id for update skip locked
                """, UUID.class).setParameter("agora", agora).setMaxResults(1).getResultStream().findFirst();
        if (proximo.isEmpty()) return Optional.empty();
        UUID lease = UUID.randomUUID();
        em.createNativeQuery("""
                update pedido_deadline_trabalho set lease_id=:lease,lease_ate=:ate,tentativas=tentativas+1
                where pedido_id=:id
                """).setParameter("lease", lease).setParameter("ate", agora.plusSeconds(120))
                .setParameter("id", proximo.get()).executeUpdate();
        return Optional.of(new TrabalhoDeadline(proximo.get(), lease));
    }

    public boolean possuiLease(TrabalhoDeadline trabalho, Instant agora) {
        return em.unwrap(Session.class).createNativeQuery("""
                select pedido_id from pedido_deadline_trabalho where pedido_id=:id and lease_id=:lease
                and lease_ate>:agora for update
                """, UUID.class).setParameter("id", trabalho.pedidoId()).setParameter("lease", trabalho.leaseId())
                .setParameter("agora", agora).getResultStream().findAny().isPresent();
    }

    public void concluir(TrabalhoDeadline trabalho, Instant proximo) {
        if (proximo == null) {
            em.createNativeQuery("delete from pedido_deadline_trabalho where pedido_id=:id and lease_id=:lease")
                    .setParameter("id", trabalho.pedidoId()).setParameter("lease", trabalho.leaseId()).executeUpdate();
        } else {
            em.createNativeQuery("""
                    update pedido_deadline_trabalho set proximo_em=:proximo,lease_id=null,lease_ate=null,
                    tentativas=0,ultima_falha=null where pedido_id=:id and lease_id=:lease
                    """).setParameter("id", trabalho.pedidoId()).setParameter("lease", trabalho.leaseId())
                    .setParameter("proximo", proximo).executeUpdate();
        }
    }

    public void falhar(TrabalhoDeadline trabalho, Instant agora, String tipo) {
        em.createNativeQuery("""
                update pedido_deadline_trabalho set bloqueado=(tentativas>=5),lease_id=null,lease_ate=null,
                proximo_em=:agora + tentativas * interval '30 seconds',ultima_falha=:tipo
                where pedido_id=:id and lease_id=:lease
                """).setParameter("id", trabalho.pedidoId()).setParameter("lease", trabalho.leaseId())
                .setParameter("agora", agora).setParameter("tipo", tipo).executeUpdate();
    }
}
