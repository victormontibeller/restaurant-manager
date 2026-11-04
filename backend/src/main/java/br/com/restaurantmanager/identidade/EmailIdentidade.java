package br.com.restaurantmanager.identidade;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="email_identidade")
public class EmailIdentidade {
    @Id UUID id;
    @Column(length=20,nullable=false) String tipo;
    @Column(length=20,nullable=false) String estado;
    @Column(name="conteudo_cifrado",columnDefinition="text") String conteudoCifrado;
    @Column(name="expira_em",nullable=false) Instant expiraEm;
    @Column(name="proxima_em",nullable=false) Instant proximaEm;
    UUID lease;
    int tentativas;
    protected EmailIdentidade() {}
    EmailIdentidade(UUID id, String tipo, String conteudo, Instant expiraEm) {
        this.id=id; this.tipo=tipo; this.conteudoCifrado=conteudo; this.expiraEm=expiraEm;
        this.estado="PENDENTE"; this.proximaEm=Instant.now();
    }
}
