package br.com.restaurantmanager.unidades;

import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Repository;

@Repository
public class EventoUnidadeRepository {
    private final EntityManager em;
    public EventoUnidadeRepository(EntityManager em) {this.em=em;}
    void registrar(Unidade unidade,String tipo) {em.persist(new EventoUnidade(unidade,tipo));}
    List<EventoUnidade> apos(UUID unidade,long versao) {
        return em.createQuery("from EventoUnidade where unidadeId=:unidade and versao>:versao order by versao",EventoUnidade.class)
                .setParameter("unidade",unidade).setParameter("versao",versao).setMaxResults(51).getResultList();
    }
}
