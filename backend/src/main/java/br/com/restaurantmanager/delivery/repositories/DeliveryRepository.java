package br.com.restaurantmanager.delivery.repositories;

import br.com.restaurantmanager.delivery.dtos.ConfigDelivery;
import br.com.restaurantmanager.delivery.dtos.RegiaoDelivery;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

@Repository
public class DeliveryRepository {
    private final EntityManager em;
    private final ObjectMapper mapper;

    public DeliveryRepository(EntityManager em, ObjectMapper mapper) {
        this.em = em;
        this.mapper = mapper;
    }

    public ConfigDelivery consultar(UUID unidade) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select versao,checkout_segundos,cast(regioes as text) from delivery_config"
                            + " where unidade_id=:id",
                        Object[].class)
                .setParameter("id", unidade)
                .getResultStream()
                .map(
                        r ->
                                new ConfigDelivery(
                                        ((Number) r[0]).longValue(),
                                        ((Number) r[1]).intValue(),
                                        List.of(
                                                mapper.readValue(
                                                        (String) r[2], RegiaoDelivery[].class))))
                .findFirst()
                .orElse(new ConfigDelivery(0, 900, List.of()));
    }

    public void salvar(UUID unidade, ConfigDelivery config) {
        em.createNativeQuery(
                        """
                        insert into delivery_config(unidade_id,versao,checkout_segundos,regioes)
                        values (:id,:v,:prazo,cast(:regioes as jsonb))
                        on conflict (unidade_id) do update set versao=excluded.versao,
                            checkout_segundos=excluded.checkout_segundos,regioes=excluded.regioes
                        """)
                .setParameter("id", unidade)
                .setParameter("v", config.versao())
                .setParameter("prazo", config.checkoutSegundos())
                .setParameter("regioes", mapper.writeValueAsString(config.regioes()))
                .executeUpdate();
    }
}
