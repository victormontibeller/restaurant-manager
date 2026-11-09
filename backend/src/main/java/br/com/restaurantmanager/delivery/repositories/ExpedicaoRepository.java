package br.com.restaurantmanager.delivery.repositories;

import br.com.restaurantmanager.delivery.dtos.OcorrenciaEntrega;
import br.com.restaurantmanager.delivery.dtos.OrcamentoEntrega;
import br.com.restaurantmanager.pedidos.dtos.EnderecoEntrega;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

@Repository
public class ExpedicaoRepository {
    private final EntityManager em;
    private final ObjectMapper mapper;

    public ExpedicaoRepository(EntityManager em, ObjectMapper mapper) {
        this.em = em;
        this.mapper = mapper;
    }

    public EnderecoEntrega endereco(UUID id) {
        return ler(id, "endereco", EnderecoEntrega.class);
    }

    public OrcamentoEntrega entrega(UUID id) {
        return ler(id, "entrega", OrcamentoEntrega.class);
    }

    private <T> T ler(UUID id, String coluna, Class<T> tipo) {
        String json =
                em.unwrap(Session.class)
                        .createNativeQuery(
                                "select cast(" + coluna + " as text) from pedido where id=:id",
                                String.class)
                        .setParameter("id", id)
                        .getSingleResult();
        return json == null ? null : mapper.readValue(json, tipo);
    }

    public OcorrenciaEntrega ocorrencia(UUID pedido) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select motivo,estado,devolver_taxa,decisao from ocorrencia_entrega where"
                            + " pedido_id=:id",
                        Object[].class)
                .setParameter("id", pedido)
                .getResultStream()
                .map(
                        r ->
                                new OcorrenciaEntrega(
                                        (String) r[0],
                                        (String) r[1],
                                        (Boolean) r[2],
                                        (String) r[3]))
                .findFirst()
                .orElse(null);
    }

    public void registrar(UUID pedido, String motivo) {
        em.createNativeQuery(
                        """
insert into ocorrencia_entrega(pedido_id,motivo,estado,registrada_em) values (:id,:motivo,'PENDENTE',now())
on conflict(pedido_id) do update set motivo=excluded.motivo,estado='PENDENTE',registrada_em=now(),decidida_em=null,decisao=null,devolver_taxa=null
""")
                .setParameter("id", pedido)
                .setParameter("motivo", motivo)
                .executeUpdate();
    }

    public void decidir(UUID pedido, String decisao, Boolean devolverTaxa, String motivo) {
        em.createNativeQuery(
                        "update ocorrencia_entrega set"
                            + " estado=:decisao,devolver_taxa=:taxa,decisao=:motivo,decidida_em=now()"
                            + " where pedido_id=:id")
                .setParameter("id", pedido)
                .setParameter("decisao", decisao)
                .setParameter("taxa", devolverTaxa)
                .setParameter("motivo", motivo)
                .executeUpdate();
    }
}
