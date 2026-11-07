package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "recuperacao_senha")
public class RecuperacaoSenha {
    @Id
    @Column(length = 64)
    private String hash;
    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;
    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;
    @Column(name = "consumido_em")
    private Instant consumidoEm;
    protected RecuperacaoSenha() {}

    private RecuperacaoSenha(String hash, UUID usuarioId, Instant expiraEm) {
        this.hash = hash;
        this.usuarioId = usuarioId;
        this.expiraEm = expiraEm;
    }

    public static RecuperacaoSenha criar(String hash, UUID usuarioId, Instant expiraEm) {
        return new RecuperacaoSenha(hash, usuarioId, expiraEm);
    }

    public String getHash() {
        return hash;
    }

    public UUID getUsuarioId() {
        return usuarioId;
    }

    public Instant getExpiraEm() {
        return expiraEm;
    }

    public Instant getConsumidoEm() {
        return consumidoEm;
    }
}
