package br.com.restaurantmanager.identidade;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="recuperacao_senha")
public class RecuperacaoSenha {
    @Id @Column(length=64) String hash;
    @Column(name="usuario_id",nullable=false) UUID usuarioId;
    @Column(name="expira_em",nullable=false) Instant expiraEm;
    @Column(name="consumido_em") Instant consumidoEm;
    protected RecuperacaoSenha() {}
    RecuperacaoSenha(String hash, UUID usuarioId, Instant expiraEm) {
        this.hash=hash; this.usuarioId=usuarioId; this.expiraEm=expiraEm;
    }
}
