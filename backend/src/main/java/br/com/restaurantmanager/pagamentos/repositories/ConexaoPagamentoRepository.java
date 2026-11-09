package br.com.restaurantmanager.pagamentos.repositories;

import br.com.restaurantmanager.pagamentos.dtos.ConexaoRegistro;
import br.com.restaurantmanager.pagamentos.dtos.OAuthRegistro;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;

import jakarta.persistence.EntityManager;

import org.hibernate.Session;
import org.hibernate.query.NativeQuery;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public class ConexaoPagamentoRepository {
    private final EntityManager em;

    public ConexaoPagamentoRepository(EntityManager em) {
        this.em = em;
    }

    public Optional<ConexaoRegistro> ativa() {
        return query(
                        "select"
                            + " id,vendedor,credencial,expira_em,reautorizar,versao,lease_id,lease_ate"
                            + " from mp_conexao where ativa",
                        Object[].class)
                .getResultStream()
                .findFirst()
                .map(this::conexao);
    }

    public ConexaoRegistro obter(UUID id, boolean lock) {
        return query(
                        "select"
                            + " id,vendedor,credencial,expira_em,reautorizar,versao,lease_id,lease_ate"
                            + " from mp_conexao where id=:id"
                                + (lock ? " for update" : ""),
                        Object[].class)
                .setParameter("id", id)
                .getResultStream()
                .findFirst()
                .map(this::conexao)
                .orElseThrow(ErrosPedido::inexistente);
    }

    public Optional<UUID> idParaVendedor(String vendedor) {
        return query("select id from mp_conexao where vendedor=:v", UUID.class)
                .setParameter("v", vendedor)
                .getResultStream()
                .findFirst();
    }

    public void autorizar(UUID id, String vendedor, String cifra, Instant expira) {
        em.createNativeQuery("update mp_conexao set ativa=false where ativa").executeUpdate();
        em.createNativeQuery(
                        "insert into mp_conexao(id,vendedor,credencial,expira_em) values"
                            + " (:id,:v,:c,:e) on conflict(id) do update set"
                            + " credencial=excluded.credencial,expira_em=excluded.expira_em,ativa=true,reautorizar=false,versao=mp_conexao.versao+1,lease_id=null,lease_ate=null")
                .setParameter("id", id)
                .setParameter("v", vendedor)
                .setParameter("c", cifra)
                .setParameter("e", expira)
                .executeUpdate();
    }

    public void iniciar(
            UUID id, String hash, String verificador, String retorno, UUID ator, UUID sessao) {
        em.createNativeQuery(
                        "insert into"
                            + " mp_oauth(id,state_hash,verificador,redirect_uri,ator_id,sessao_id,expira_em,estado)"
                            + " values (:id,:hash,:v,:r,:a,:s,now()+interval '5 minutes','CRIADO')")
                .setParameter("id", id)
                .setParameter("hash", hash)
                .setParameter("v", verificador)
                .setParameter("r", retorno)
                .setParameter("a", ator)
                .setParameter("s", sessao)
                .executeUpdate();
    }

    public OAuthRegistro oauth(String hash) {
        return query(
                        "select id,verificador,redirect_uri,ator_id,sessao_id,expira_em,estado from"
                            + " mp_oauth where state_hash=:hash for update",
                        Object[].class)
                .setParameter("hash", hash)
                .getResultStream()
                .findFirst()
                .map(
                        r ->
                                new OAuthRegistro(
                                        (UUID) r[0],
                                        (String) r[1],
                                        (String) r[2],
                                        (UUID) r[3],
                                        (UUID) r[4],
                                        instante(r[5]),
                                        (String) r[6]))
                .orElseThrow(ErrosPedido::inexistente);
    }

    public void estadoOAuth(UUID id, String estado) {
        em.createNativeQuery(
                        "update mp_oauth set estado=:e,verificador=case when :e='PROCESSANDO' then"
                            + " verificador else '' end where id=:id")
                .setParameter("id", id)
                .setParameter("e", estado)
                .executeUpdate();
    }

    public void lease(UUID id, UUID lease) {
        em.createNativeQuery(
                        "update mp_conexao set lease_id=:l,lease_ate=now()+interval '2 minutes'"
                            + " where id=:id")
                .setParameter("l", lease)
                .setParameter("id", id)
                .executeUpdate();
    }

    public void falhar(UUID id, UUID lease) {
        em.createNativeQuery(
                        "update mp_conexao set reautorizar=true,lease_id=null,lease_ate=null where"
                            + " id=:id and lease_id=:l")
                .setParameter("id", id)
                .setParameter("l", lease)
                .executeUpdate();
    }

    public void renovar(UUID id, UUID lease, String cifra, Instant expira) {
        int n =
                em.createNativeQuery(
                                "update mp_conexao set"
                                    + " credencial=:c,expira_em=:e,versao=versao+1,lease_id=null,lease_ate=null"
                                    + " where id=:id and lease_id=:l and lease_ate>now()")
                        .setParameter("id", id)
                        .setParameter("l", lease)
                        .setParameter("c", cifra)
                        .setParameter("e", expira)
                        .executeUpdate();
        if (n != 1) throw ErrosPedido.conflito("A renovação da conexão exige reconciliação.");
    }

    private ConexaoRegistro conexao(Object[] r) {
        return new ConexaoRegistro(
                (UUID) r[0],
                (String) r[1],
                (String) r[2],
                instante(r[3]),
                (Boolean) r[4],
                ((Number) r[5]).longValue(),
                (UUID) r[6],
                instante(r[7]));
    }

    private static Instant instante(Object v) {
        if (v == null) return null;
        if (v instanceof Instant i) return i;
        if (v instanceof OffsetDateTime i) return i.toInstant();
        return ((Timestamp) v).toInstant();
    }

    private <T> NativeQuery<T> query(String sql, Class<T> tipo) {
        return em.unwrap(Session.class).createNativeQuery(sql, tipo);
    }
}
