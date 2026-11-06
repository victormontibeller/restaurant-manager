package br.com.restaurantmanager.identidade;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.NamedQuery;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;

@Entity
@Table(name = "usuario")
@NamedQuery(name = "Usuario.porEmail", query = "from Usuario where email=:email")
public class Usuario {
    @Id UUID id;
    @Column(nullable = false, length = 254) String email;
    @Column(name = "senha_hash", nullable = false, length = 100) String senhaHash;
    @Column(nullable = false, length = 20) String perfil;
    boolean ativo;
    @Column(name = "email_verificado") boolean emailVerificado;
    @Version long versao;
    @Column(name = "alterado_em") java.time.Instant alteradoEm;
    protected Usuario() {}
}
