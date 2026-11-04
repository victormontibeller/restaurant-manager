package br.com.restaurantmanager.identidade;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="auditoria_acesso")
public class AuditoriaAcesso {
    @Id UUID id;
    @Column(name="ator_id") UUID atorId;
    @Column(name="recurso_id") UUID recursoId;
    @Column(length=60) String evento;
    @Column(columnDefinition="text") String antes;
    @Column(columnDefinition="text") String depois;
    @Column(name="ocorrido_em") Instant ocorridoEm;
    protected AuditoriaAcesso() {}
    AuditoriaAcesso(UUID ator,UUID recurso,String evento,String antes,String depois) {
        id=UUID.randomUUID();atorId=ator;recursoId=recurso;this.evento=evento;this.antes=antes;this.depois=depois;ocorridoEm=Instant.now();
    }
}
