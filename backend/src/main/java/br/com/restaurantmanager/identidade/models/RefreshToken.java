package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_token")
public class RefreshToken {
    @Id
    @Column(length = 64)
    private String hash;
    @Column(name = "sessao_id", nullable = false)
    private UUID sessaoId;
    @Column(name = "usado_em")
    private Instant usadoEm;
    protected RefreshToken() {}

    private RefreshToken(String hash, UUID sessaoId) {
        this.hash = hash;
        this.sessaoId = sessaoId;
    }

    public static RefreshToken criar(String hash, UUID sessaoId) {
        return new RefreshToken(hash, sessaoId);
    }

    public String getHash() {
        return hash;
    }

    public UUID getSessaoId() {
        return sessaoId;
    }

    public Instant getUsadoEm() {
        return usadoEm;
    }

    public void consumir(Instant agora) {
        usadoEm = agora;
    }
}
