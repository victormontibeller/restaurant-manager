package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "auditoria_acesso")
public class AuditoriaAcesso {
    @Id
    private UUID id;
    @Column(name = "ator_id")
    private UUID atorId;
    @Column(name = "recurso_id")
    private UUID recursoId;
    @Column(length = 60)
    private String evento;
    @Column(columnDefinition = "text")
    private String antes;
    @Column(columnDefinition = "text")
    private String depois;
    @Column(name = "ocorrido_em")
    private Instant ocorridoEm;
    protected AuditoriaAcesso() {}

    private AuditoriaAcesso(UUID ator, UUID recurso, String evento, String antes, String depois) {
        id = UUID.randomUUID();
        atorId = ator;
        recursoId = recurso;
        this.evento = evento;
        this.antes = antes;
        this.depois = depois;
        ocorridoEm = Instant.now();
    }

    public static AuditoriaAcesso criar(UUID ator, UUID recurso, String evento, String antes, String depois) {
        return new AuditoriaAcesso(ator, recurso, evento, antes, depois);
    }

    public UUID getId() {
        return id;
    }

    public UUID getAtorId() {
        return atorId;
    }

    public UUID getRecursoId() {
        return recursoId;
    }

    public String getEvento() {
        return evento;
    }

    public String getAntes() {
        return antes;
    }

    public String getDepois() {
        return depois;
    }

    public Instant getOcorridoEm() {
        return ocorridoEm;
    }
}
