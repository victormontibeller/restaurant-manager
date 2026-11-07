package br.com.restaurantmanager.midia.repositories;

import br.com.restaurantmanager.midia.dtos.CotaMidia;
import br.com.restaurantmanager.midia.dtos.ImagemNormalizada;
import br.com.restaurantmanager.midia.dtos.MidiaResumo;
import br.com.restaurantmanager.midia.dtos.RegistroMidia;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class MidiaRepository {
    private final EntityManager em;

    public MidiaRepository(EntityManager em) {
        this.em = em;
    }

    public CotaMidia bloquearCota() {
        Object[] linha = (Object[]) em.createNativeQuery("""
                select quantidade, bytes from controle_midia where id = true for update
                """, Object[].class).getSingleResult();
        // O lock continua até o commit. A autorização seguinte precisa reler sessão/usuário
        // depois de uma possível espera pela cota, sem reaproveitar o cache do EntityManager.
        em.clear();
        return new CotaMidia(((Number) linha[0]).intValue(), ((Number) linha[1]).longValue());
    }

    public Optional<RegistroMidia> consultar(UUID id) {
        List<Object[]> linhas = em.createNativeQuery("""
                select id, tipo, largura, altura, tamanho, sha256, autor_id
                  from midia where id = :id and publicada = true
                """, Object[].class).setParameter("id", id).getResultList();
        return linhas.stream().findFirst().map(linha -> new RegistroMidia(
                MidiaResumo.criar((UUID) linha[0], (String) linha[1],
                        ((Number) linha[2]).intValue(), ((Number) linha[3]).intValue(),
                        ((Number) linha[4]).intValue(), (String) linha[5]), (UUID) linha[6]));
    }

    public byte[] conteudo(UUID id) {
        return (byte[]) em.createNativeQuery("select conteudo from midia where id = :id and publicada = true")
                .setParameter("id", id).getSingleResult();
    }

    public void publicar(UUID id, UUID autor, ImagemNormalizada imagem) {
        em.createNativeQuery("""
                insert into midia(id, autor_id, tipo, largura, altura, tamanho, sha256, conteudo, publicada)
                values (:id, :autor, :tipo, :largura, :altura, :tamanho, :sha256, :conteudo, true)
                """)
                .setParameter("id", id).setParameter("autor", autor).setParameter("tipo", imagem.tipo())
                .setParameter("largura", imagem.largura()).setParameter("altura", imagem.altura())
                .setParameter("tamanho", imagem.conteudo().length).setParameter("sha256", imagem.sha256())
                .setParameter("conteudo", imagem.conteudo()).executeUpdate();
        em.createNativeQuery("""
                update controle_midia set quantidade = quantidade + 1, bytes = bytes + :tamanho where id = true
                """).setParameter("tamanho", imagem.conteudo().length).executeUpdate();
        em.createNativeQuery("""
                insert into auditoria_midia(id, midia_id, autor_id, evento)
                values (:id, :midia, :autor, 'PUBLICACAO')
                """).setParameter("id", UUID.randomUUID()).setParameter("midia", id)
                .setParameter("autor", autor).executeUpdate();
    }
}
