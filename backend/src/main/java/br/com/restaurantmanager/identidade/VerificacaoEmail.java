package br.com.restaurantmanager.identidade;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="verificacao_email")
public class VerificacaoEmail {
    @Id @Column(length=64) String hash;
    @Column(name="usuario_id",nullable=false) UUID usuarioId;
    @Column(nullable=false,length=254) String email;
    @Column(name="expira_em",nullable=false) Instant expiraEm;
    @Column(name="consumido_em") Instant consumidoEm;
    protected VerificacaoEmail() {}
    VerificacaoEmail(String hash,UUID usuarioId,String email,Instant expiraEm) {
        this.hash=hash;this.usuarioId=usuarioId;this.email=email;this.expiraEm=expiraEm;
    }
}
