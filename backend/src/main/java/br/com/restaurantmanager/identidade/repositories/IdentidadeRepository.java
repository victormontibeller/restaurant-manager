package br.com.restaurantmanager.identidade.repositories;

import br.com.restaurantmanager.identidade.models.PoliticaAcesso;
import br.com.restaurantmanager.identidade.models.RefreshToken;
import br.com.restaurantmanager.identidade.models.Sessao;
import br.com.restaurantmanager.identidade.models.Usuario;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class IdentidadeRepository {
    private final EntityManager em;

    public IdentidadeRepository(EntityManager em) {
        this.em = em;
    }

    public void bloquearAlteracoesDeAcesso() {
        em.find(PoliticaAcesso.class, 1, LockModeType.PESSIMISTIC_READ);
    }

    public Optional<Usuario> porEmail(String email) {
        return em.createNamedQuery("Usuario.porEmail", Usuario.class)
                .setParameter("email", email)
                .getResultStream()
                .findFirst();
    }

    public Usuario usuario(UUID id) {
        return em.find(Usuario.class, id);
    }

    public Sessao sessao(UUID id, boolean lock) {
        return em.find(Sessao.class, id, lock ? LockModeType.PESSIMISTIC_WRITE : LockModeType.NONE);
    }

    public RefreshToken refresh(String hash) {
        return em.find(RefreshToken.class, hash);
    }

    public void atualizar(RefreshToken token) {
        em.refresh(token);
    }

    public void salvar(Object entity) {
        em.persist(entity);
    }

    public int tentativa(String chave, Instant agora) {
        return ((Number) em.createNativeQuery("insert into limite_login(chave,tentativas,inicio_em) values (:chave,1,:agora) " + "on conflict(chave) do update set tentativas=case when limite_login.inicio_em <= :limite then 1 else limite_login.tentativas+1 end, " + "inicio_em=case when limite_login.inicio_em <= :limite then :agora else limite_login.inicio_em end returning tentativas")
                .setParameter("chave", chave)
                .setParameter("agora", agora)
                .setParameter("limite", agora.minusSeconds(900))
                .getSingleResult()).intValue();
    }

    public void limparTentativas(String chave) {
        em.createNativeQuery("update limite_login set tentativas=0 where chave=:chave")
                .setParameter("chave", chave)
                .executeUpdate();
    }
}
