package br.com.restaurantmanager.identidade;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "sessao")
public class Sessao {
    @Id UUID id;
    @Column(name = "usuario_id", nullable = false) UUID usuarioId;
    @Column(name = "criada_em", nullable = false) Instant criadaEm;
    @Column(name = "expira_em", nullable = false) Instant expiraEm;
    @Column(name = "revogada_em") Instant revogadaEm;
    @Column(name = "autenticada_em", nullable = false) Instant autenticadaEm;
    protected Sessao() {}
    Sessao(UUID usuario, Instant agora) {
        id = UUID.randomUUID(); usuarioId = usuario; criadaEm = agora;
        autenticadaEm = agora; expiraEm = agora.plusSeconds(43200);
    }
    boolean valida(Instant agora) { return revogadaEm == null && expiraEm.isAfter(agora); }
}
