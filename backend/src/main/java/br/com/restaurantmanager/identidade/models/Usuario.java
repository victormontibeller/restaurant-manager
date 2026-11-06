package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.NamedQuery;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "usuario")
@NamedQuery(name = "Usuario.porEmail", query = "from Usuario where email=:email")
public class Usuario {
    @Id
    private UUID id;
    @Column(nullable = false, length = 254)
    private String email;
    @Column(name = "senha_hash", nullable = false, length = 100)
    private String senhaHash;
    @Column(nullable = false, length = 20)
    private String perfil;
    private boolean ativo;
    @Column(name = "email_verificado")
    private boolean emailVerificado;
    @Version
    private long versao;
    @Column(name = "alterado_em")
    private Instant alteradoEm;
    protected Usuario() {}

    public UUID getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getSenhaHash() {
        return senhaHash;
    }

    public String getPerfil() {
        return perfil;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public boolean isEmailVerificado() {
        return emailVerificado;
    }

    public long getVersao() {
        return versao;
    }

    public Instant getAlteradoEm() {
        return alteradoEm;
    }

    public static Usuario criarVerificado(String email, String senhaHash, String perfil, Instant agora) {
        var usuario = new Usuario();
        usuario.id = UUID.randomUUID();
        usuario.email = email;
        usuario.senhaHash = senhaHash;
        usuario.perfil = perfil;
        usuario.ativo = true;
        usuario.emailVerificado = true;
        usuario.alteradoEm = agora;
        return usuario;
    }

    public void alterarAcessos(String perfil, boolean ativo, Instant agora) {
        this.perfil = perfil;
        this.ativo = ativo;
        this.alteradoEm = agora;
    }

    public void alterarSenha(String senhaHash, Instant agora) {
        this.senhaHash = senhaHash;
        this.alteradoEm = agora;
    }

    public void verificarEmail(Instant agora) {
        this.emailVerificado = true;
        this.alteradoEm = agora;
    }
}
