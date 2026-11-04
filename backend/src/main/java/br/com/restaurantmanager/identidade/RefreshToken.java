package br.com.restaurantmanager.identidade;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "refresh_token")
public class RefreshToken {
    @Id @Column(length = 64) String hash;
    @Column(name = "sessao_id", nullable = false) UUID sessaoId;
    @Column(name = "usado_em") Instant usadoEm;
    protected RefreshToken() {}
    RefreshToken(String hash, UUID sessaoId) { this.hash = hash; this.sessaoId = sessaoId; }
}
