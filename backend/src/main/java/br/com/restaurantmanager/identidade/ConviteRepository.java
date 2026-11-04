package br.com.restaurantmanager.identidade;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class ConviteRepository {
    private final EntityManager em;
    public ConviteRepository(EntityManager em) {this.em=em;}
    ConviteFuncionario obter(UUID id) {return em.find(ConviteFuncionario.class,id);}
    ConviteFuncionario bloquear(UUID id) {return em.find(ConviteFuncionario.class,id,LockModeType.PESSIMISTIC_WRITE);}
    ConviteFuncionario codigo(String hash) {
        return em.createQuery("from ConviteFuncionario where codigoHash=:hash",ConviteFuncionario.class).setParameter("hash",hash)
                .setLockMode(LockModeType.PESSIMISTIC_WRITE).getResultStream().findFirst().orElse(null);
    }
    void salvar(ConviteFuncionario convite) {em.persist(convite);}
    List<ConviteFuncionario> listar(int pagina) {
        return em.createQuery("from ConviteFuncionario order by criadoEm desc,id",ConviteFuncionario.class).setFirstResult(pagina*50).setMaxResults(50).getResultList();
    }
    long recentes(UUID autor,Instant desde) {
        return em.createQuery("select count(c) from ConviteFuncionario c where autorId=:autor and criadoEm>:desde",Long.class)
                .setParameter("autor",autor).setParameter("desde",desde).getSingleResult();
    }
    void revogarOutros(String email,UUID aceito,Instant agora) {
        em.createQuery("update ConviteFuncionario set revogadoEm=:agora where email=:email and id<>:id and aceitoEm is null and revogadoEm is null")
                .setParameter("agora",agora).setParameter("email",email).setParameter("id",aceito).executeUpdate();
    }
    void expurgar(Instant limite) {
        // A intenção e seu payload original permanecem para reconciliar retries antigos.
        em.createNativeQuery("update convite_funcionario set codigo_hash=null where id in (select id from convite_funcionario where expira_em<:limite and codigo_hash is not null order by expira_em,id limit 100 for update skip locked)")
                .setParameter("limite",limite).executeUpdate();
    }
}
