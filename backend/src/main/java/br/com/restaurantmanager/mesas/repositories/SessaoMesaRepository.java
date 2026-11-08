package br.com.restaurantmanager.mesas.repositories;

import br.com.restaurantmanager.mesas.dtos.RefreshMesaPersistido;
import br.com.restaurantmanager.mesas.dtos.SessaoMesaPersistida;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class SessaoMesaRepository {
    private final EntityManager em;

    public SessaoMesaRepository(EntityManager em) {
        this.em = em;
    }

    public SessaoMesaPersistida sessao(UUID id, boolean bloquear) {
        var rows = em.createNativeQuery("select s.id,p.id,a.id,c.id,c.unidade_id,s.expira_em,s.revogada_em,c.estado,a.encerrado_em "
                        + "from sessao_mesa s join participante_mesa p on p.id=s.participante_id join atendimento a on a.id=p.atendimento_id "
                        + "join comanda c on c.atendimento_id=a.id where s.id=:id" + (bloquear ? " for update of s" : ""))
                .setParameter("id", id).getResultList();
        if (rows.isEmpty()) return null;
        var r = (Object[]) rows.getFirst();
        return new SessaoMesaPersistida(uuid(r[0]), uuid(r[1]), uuid(r[2]), uuid(r[3]), uuid(r[4]),
                MesaRepository.instante(r[5]), MesaRepository.instante(r[6]), r[7].toString(), MesaRepository.instante(r[8]));
    }

    public void criar(UUID participante, UUID sessao, UUID atendimento, Instant agora) {
        em.createNativeQuery("insert into participante_mesa(id,atendimento_id,criado_em) values (:id,:atendimento,:agora)")
                .setParameter("id", participante).setParameter("atendimento", atendimento).setParameter("agora", agora).executeUpdate();
        em.createNativeQuery("insert into sessao_mesa(id,participante_id,expira_em) values (:id,:participante,:expira)")
                .setParameter("id", sessao).setParameter("participante", participante).setParameter("expira", agora.plusSeconds(43200)).executeUpdate();
    }

    public RefreshMesaPersistido refresh(String hash) {
        var rows = em.createNativeQuery("select sessao_id,usado_em from refresh_mesa where hash=:hash")
                .setParameter("hash", hash).getResultList();
        if (rows.isEmpty()) return null;
        var r = (Object[]) rows.getFirst();
        return new RefreshMesaPersistido(uuid(r[0]), MesaRepository.instante(r[1]));
    }

    public void inserirRefresh(String hash, UUID sessao) {
        em.createNativeQuery("insert into refresh_mesa(hash,sessao_id) values (:hash,:sessao)")
                .setParameter("hash", hash).setParameter("sessao", sessao).executeUpdate();
    }

    public void consumirRefresh(String hash, Instant agora) {
        em.createNativeQuery("update refresh_mesa set usado_em=:agora where hash=:hash")
                .setParameter("hash", hash).setParameter("agora", agora).executeUpdate();
    }

    public void revogar(UUID sessao, Instant agora) {
        em.createNativeQuery("update sessao_mesa set revogada_em=coalesce(revogada_em,:agora) where id=:id")
                .setParameter("id", sessao).setParameter("agora", agora).executeUpdate();
    }

    public int tentativa(String chave, Instant agora) {
        return ((Number) em.createNativeQuery("insert into tentativa_mesa(chave,inicio,quantidade) values (:chave,:agora,1) "
                        + "on conflict(chave) do update set quantidade=case when tentativa_mesa.inicio<=:limite then 1 else tentativa_mesa.quantidade+1 end, "
                        + "inicio=case when tentativa_mesa.inicio<=:limite then :agora else tentativa_mesa.inicio end returning quantidade")
                .setParameter("chave", chave).setParameter("agora", agora).setParameter("limite", agora.minusSeconds(900)).getSingleResult()).intValue();
    }

    private UUID uuid(Object value) {
        return UUID.fromString(value.toString());
    }
}
