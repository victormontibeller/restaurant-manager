package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "verificacao_email")
public class VerificacaoEmail {
    @Id
    @Column(length = 64)
    private String hash;
    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;
    @Column(nullable = false, length = 254)
    private String email;
    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;
    @Column(name = "consumido_em")
    private Instant consumidoEm;
    protected VerificacaoEmail() {}

    private VerificacaoEmail(String hash, UUID usuarioId, String email, Instant expiraEm) {
        this.hash = hash;
        this.usuarioId = usuarioId;
        this.email = email;
        this.expiraEm = expiraEm;
    }

    public static VerificacaoEmail criar(String hash, UUID usuarioId, String email, Instant expiraEm) {
        return new VerificacaoEmail(hash, usuarioId, email, expiraEm);
    }

    public String getHash() {
        return hash;
    }

    public UUID getUsuarioId() {
        return usuarioId;
    }

    public String getEmail() {
        return email;
    }

    public Instant getExpiraEm() {
        return expiraEm;
    }

    public Instant getConsumidoEm() {
        return consumidoEm;
    }
}
