package br.com.restaurantmanager.identidade.repositories;

import br.com.restaurantmanager.identidade.models.VerificacaoEmail;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class VerificacaoEmailRepository {
    private final EntityManager em;

    public VerificacaoEmailRepository(EntityManager em) {
        this.em = em;
    }

    public void salvar(VerificacaoEmail codigo) {
        em.persist(codigo);
    }

    public VerificacaoEmail codigo(String hash) {
        return em.find(VerificacaoEmail.class, hash, LockModeType.PESSIMISTIC_WRITE);
    }

    public void consumirTodos(UUID usuario, Instant agora) {
        em.createQuery("update VerificacaoEmail set consumidoEm=:agora where usuarioId=:usuario and consumidoEm is null")
                .setParameter("agora", agora)
                .setParameter("usuario", usuario)
                .executeUpdate();
    }

    public void expurgar(Instant limite) {
        em.createNativeQuery("delete from verificacao_email where hash in (select hash from verificacao_email where expira_em<:limite order by expira_em,hash limit 100 for update skip locked)")
                .setParameter("limite", limite)
                .executeUpdate();
    }
}
