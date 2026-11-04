package br.com.restaurantmanager.identidade;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class RecuperacaoRepository {
    private final EntityManager em;
    public RecuperacaoRepository(EntityManager em) { this.em=em; }
    void salvar(Object entity) { em.persist(entity); }
    RecuperacaoSenha token(String hash) { return em.find(RecuperacaoSenha.class,hash,LockModeType.PESSIMISTIC_WRITE); }
    void consumirTodos(UUID usuario,Instant agora) {
        em.createQuery("update RecuperacaoSenha set consumidoEm=:agora where usuarioId=:id and consumidoEm is null")
                .setParameter("agora",agora).setParameter("id",usuario).executeUpdate();
    }
    List<EmailIdentidade> proximo(Instant agora) {
        return em.createNativeQuery("select * from email_identidade where estado in ('PENDENTE','PROCESSANDO') and proxima_em<=:agora order by proxima_em,id limit 1 for update skip locked",EmailIdentidade.class)
                .setParameter("agora",agora).getResultList();
    }
    EmailIdentidade email(UUID id) { return em.find(EmailIdentidade.class,id,LockModeType.PESSIMISTIC_WRITE); }
    void expurgar(Instant limite) {
        em.createNativeQuery("delete from recuperacao_senha where hash in (select hash from recuperacao_senha where expira_em<:limite order by expira_em,hash limit 100 for update skip locked)").setParameter("limite",limite).executeUpdate();
        em.createNativeQuery("delete from email_identidade where id in (select id from email_identidade where expira_em<:limite order by expira_em,id limit 100 for update skip locked)").setParameter("limite",limite).executeUpdate();
    }
}
