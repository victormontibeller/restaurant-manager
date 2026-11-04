package br.com.restaurantmanager.identidade;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class VerificacaoEmailRepository {
    private final EntityManager em;
    public VerificacaoEmailRepository(EntityManager em) {this.em=em;}
    void salvar(VerificacaoEmail codigo) {em.persist(codigo);}
    VerificacaoEmail codigo(String hash) {return em.find(VerificacaoEmail.class,hash,LockModeType.PESSIMISTIC_WRITE);}
    void consumirTodos(UUID usuario,Instant agora) {
        em.createQuery("update VerificacaoEmail set consumidoEm=:agora where usuarioId=:usuario and consumidoEm is null")
                .setParameter("agora",agora).setParameter("usuario",usuario).executeUpdate();
    }
    void expurgar(Instant limite) {
        em.createNativeQuery("delete from verificacao_email where hash in (select hash from verificacao_email where expira_em<:limite order by expira_em,hash limit 100 for update skip locked)")
                .setParameter("limite",limite).executeUpdate();
    }
}
