package br.com.restaurantmanager.identidade;

import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.time.Instant;
import org.springframework.stereotype.Repository;

@Repository
public class CadastroClienteRepository {
    private final EntityManager em;
    public CadastroClienteRepository(EntityManager em) { this.em=em; }
    void salvar(CadastroCliente codigo) { em.persist(codigo); }
    CadastroCliente codigo(String hash) { return em.find(CadastroCliente.class,hash,LockModeType.PESSIMISTIC_WRITE); }
    void consumirTodos(String email,Instant agora) {
        em.createQuery("update CadastroCliente set consumidoEm=:agora where email=:email and consumidoEm is null")
                .setParameter("agora",agora).setParameter("email",email).executeUpdate();
    }
    void expurgar(Instant limite) {
        em.createNativeQuery("delete from cadastro_cliente where hash in (select hash from cadastro_cliente where expira_em<:limite order by expira_em,hash limit 100 for update skip locked)")
                .setParameter("limite",limite).executeUpdate();
    }
}
