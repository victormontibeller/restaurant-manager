package br.com.restaurantmanager.unidades;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="evento_unidade")
public class EventoUnidade {
    @Id UUID id;
    @Column(name="unidade_id") UUID unidadeId;
    long versao;
    @Column(length=40) String tipo;
    @Column(length=120) String nome;
    @Column(length=60) String fuso;
    boolean ativa;
    @Column(name="ocorrido_em") Instant ocorridoEm;
    protected EventoUnidade() {}
    EventoUnidade(Unidade unidade,String tipo) {
        id=UUID.randomUUID();unidadeId=unidade.getId();versao=unidade.getVersao();
        this.tipo=tipo;nome=unidade.getNome();fuso=unidade.getFuso();ativa=unidade.isAtiva();ocorridoEm=Instant.now();
    }
}
