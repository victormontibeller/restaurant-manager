package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sessao")
public class Sessao {
    @Id
    private UUID id;
    @Column(name = "usuario_id", nullable = false)
    private UUID usuarioId;
    @Column(name = "criada_em", nullable = false)
    private Instant criadaEm;
    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;
    @Column(name = "revogada_em")
    private Instant revogadaEm;
    @Column(name = "autenticada_em", nullable = false)
    private Instant autenticadaEm;
    @Column(name = "reautenticada_em")
    private Instant reautenticadaEm;
    protected Sessao() {}

    private Sessao(UUID usuario, Instant agora) {
        id = UUID.randomUUID();
        usuarioId = usuario;
        criadaEm = agora;
        autenticadaEm = agora;
        expiraEm = agora.plusSeconds(43200);
    }

    public boolean valida(Instant agora) {
        return revogadaEm == null && expiraEm.isAfter(agora);
    }

    public static Sessao criar(UUID usuario, Instant agora) {
        return new Sessao(usuario, agora);
    }

    public UUID getId() {
        return id;
    }

    public UUID getUsuarioId() {
        return usuarioId;
    }

    public Instant getCriadaEm() {
        return criadaEm;
    }

    public Instant getExpiraEm() {
        return expiraEm;
    }

    public Instant getRevogadaEm() {
        return revogadaEm;
    }

    public Instant getAutenticadaEm() {
        return autenticadaEm;
    }

    public Instant getReautenticadaEm() {
        return reautenticadaEm;
    }

    public void revogar(Instant agora) {
        revogadaEm = agora;
    }

    public void reautenticar(Instant agora) {
        reautenticadaEm = agora;
    }
}
