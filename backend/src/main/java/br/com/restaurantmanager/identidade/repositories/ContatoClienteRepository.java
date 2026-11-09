package br.com.restaurantmanager.identidade.repositories;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public class ContatoClienteRepository {
    private final EntityManager em;

    public ContatoClienteRepository(EntityManager em) {
        this.em = em;
    }

    public String email(UUID id) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select email from usuario where id=:id and perfil='CLIENTE' and"
                            + " email_verificado",
                        String.class)
                .setParameter("id", id)
                .getResultStream()
                .findFirst()
                .orElse(null);
    }
}
