package br.com.restaurantmanager.identidade.repositories;

import br.com.restaurantmanager.identidade.models.AuditoriaAcesso;
import br.com.restaurantmanager.identidade.models.PoliticaAcesso;
import br.com.restaurantmanager.identidade.models.Sessao;
import br.com.restaurantmanager.identidade.models.Usuario;
import br.com.restaurantmanager.unidades.models.Unidade;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class AcessosRepository {
    private final EntityManager em;

    public AcessosRepository(EntityManager em) {
        this.em = em;
    }

    public PoliticaAcesso politica(boolean escrita) {
        var politica = em.find(PoliticaAcesso.class, 1, escrita ? LockModeType.PESSIMISTIC_WRITE : LockModeType.PESSIMISTIC_READ);
        em.refresh(politica);
        return politica;
    }

    public Usuario usuario(UUID id) {
        return em.find(Usuario.class, id);
    }

    public Sessao sessao(UUID id) {
        return em.find(Sessao.class, id);
    }

    public List<Usuario> equipe(int pagina) {
        return em.createQuery("from Usuario where perfil <> 'CLIENTE' order by email", Usuario.class)
                .setFirstResult(pagina * 50)
                .setMaxResults(50)
                .getResultList();
    }

    public long administradores() {
        return em.createQuery("select count(u) from Usuario u where u.ativo=true and u.perfil='ADMINISTRADOR'", Long.class)
                .getSingleResult();
    }

    @SuppressWarnings("unchecked")
    public List<UUID> unidades(UUID usuario) {
        return em.createNativeQuery("select unidade_id from usuario_unidade where usuario_id=:id order by unidade_id", UUID.class)
                .setParameter("id", usuario)
                .getResultList();
    }

    public List<Unidade> unidadesAtivas() {
        return em.createQuery("from Unidade where ativa=true order by nome", Unidade.class)
                .getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<String> permissoes(String perfil) {
        return em.createNativeQuery("select acao from permissao_perfil where perfil=:perfil order by acao", String.class)
                .setParameter("perfil", perfil)
                .getResultList();
    }

    public void substituirPermissoes(String perfil, Set<String> acoes) {
        em.createNativeQuery("delete from permissao_perfil where perfil=:perfil")
                .setParameter("perfil", perfil)
                .executeUpdate();
        for (String acao : acoes) {
            em.createNativeQuery("insert into permissao_perfil(perfil,acao) values (:perfil,:acao)")
                    .setParameter("perfil", perfil)
                    .setParameter("acao", acao)
                    .executeUpdate();
        }
    }

    public void substituirUnidades(UUID id, Set<UUID> unidades) {
        em.createNativeQuery("delete from usuario_unidade where usuario_id=:id")
                .setParameter("id", id)
                .executeUpdate();
        for (UUID unidade : unidades) {
            em.createNativeQuery("insert into usuario_unidade(usuario_id,unidade_id) values (:id,:unidade)")
                    .setParameter("id", id)
                    .setParameter("unidade", unidade)
                    .executeUpdate();
        }
    }

    public void revogarSessoes(UUID usuario) {
        em.createQuery("update Sessao set revogadaEm=:agora where usuarioId=:id and revogadaEm is null")
                .setParameter("agora", Instant.now())
                .setParameter("id", usuario)
                .executeUpdate();
    }

    public void auditar(UUID ator, UUID recurso, String evento, String antes, String depois) {
        em.persist(AuditoriaAcesso.criar(ator, recurso, evento, antes, depois));
    }

    public void incrementarPolitica(PoliticaAcesso politica) {
        em.createNativeQuery("update politica_acesso set versao=versao+1 where id=1")
                .executeUpdate();
        em.refresh(politica);
    }

    public void flush() {
        em.flush();
    }
}
