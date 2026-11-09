package br.com.restaurantmanager.delivery.repositories;

import br.com.restaurantmanager.delivery.dtos.EnderecoCliente;
import br.com.restaurantmanager.pedidos.dtos.EnderecoEntrega;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.springframework.stereotype.Repository;

import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public class EnderecoClienteRepository {
    private final EntityManager em;
    private final ObjectMapper mapper;

    public EnderecoClienteRepository(EntityManager em, ObjectMapper mapper) {
        this.em = em;
        this.mapper = mapper;
    }

    public void bloquear(UUID id) {
        em.unwrap(Session.class)
                .createNativeQuery(
                        "select 1 from pg_advisory_xact_lock(hashtextextended(:id,3))",
                        Integer.class)
                .setParameter("id", id.toString())
                .getSingleResult();
    }

    public List<EnderecoCliente> listar(UUID usuario, int pagina) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select id,versao,descricao,cast(endereco as text),ativo from"
                            + " endereco_cliente where usuario_id=:u and ativo order by id",
                        Object[].class)
                .setParameter("u", usuario)
                .setFirstResult(pagina * 50)
                .setMaxResults(50)
                .getResultStream()
                .map(this::endereco)
                .toList();
    }

    public Optional<EnderecoCliente> consultar(UUID id, UUID usuario) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select id,versao,descricao,cast(endereco as text),ativo from"
                            + " endereco_cliente where id=:id and usuario_id=:u for update",
                        Object[].class)
                .setParameter("id", id)
                .setParameter("u", usuario)
                .getResultStream()
                .findFirst()
                .map(this::endereco);
    }

    public boolean existe(UUID id) {
        return em.unwrap(Session.class)
                .createNativeQuery(
                        "select exists(select 1 from endereco_cliente where id=:id)", Boolean.class)
                .setParameter("id", id)
                .getSingleResult();
    }

    public void salvar(UUID usuario, EnderecoCliente entrada) {
        em.createNativeQuery(
                        """
insert into endereco_cliente(id,usuario_id,versao,descricao,endereco,ativo) values (:id,:u,:v,:d,cast(:e as jsonb),:a)
on conflict(id) do update set versao=excluded.versao,descricao=excluded.descricao,endereco=excluded.endereco,ativo=excluded.ativo
""")
                .setParameter("id", entrada.id())
                .setParameter("u", usuario)
                .setParameter("v", entrada.versao())
                .setParameter("d", entrada.descricao())
                .setParameter("e", mapper.writeValueAsString(entrada.endereco()))
                .setParameter("a", entrada.ativo())
                .executeUpdate();
    }

    private EnderecoCliente endereco(Object[] r) {
        return new EnderecoCliente(
                (UUID) r[0],
                ((Number) r[1]).longValue(),
                (String) r[2],
                mapper.readValue((String) r[3], EnderecoEntrega.class),
                (Boolean) r[4]);
    }
}
