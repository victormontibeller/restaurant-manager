package br.com.restaurantmanager.unidades.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "evento_unidade")
public class EventoUnidade {
    @Id
    private UUID id;

    @Column(name = "unidade_id")
    private UUID unidadeId;

    private long versao;

    @Column(length = 40)
    private String tipo;

    @Column(length = 120)
    private String nome;

    @Column(length = 60)
    private String fuso;

    private boolean ativa;

    @Column(name = "ocorrido_em")
    private Instant ocorridoEm;

    protected EventoUnidade() {}

    public EventoUnidade(Unidade unidade, String tipo) {
        this.id = UUID.randomUUID();
        this.unidadeId = unidade.getId();
        this.versao = unidade.getVersao();
        this.tipo = tipo;
        this.nome = unidade.getNome();
        this.fuso = unidade.getFuso();
        this.ativa = unidade.isAtiva();
        this.ocorridoEm = Instant.now();
    }

    public UUID getId() {
        return id;
    }

    public UUID getUnidadeId() {
        return unidadeId;
    }

    public long getVersao() {
        return versao;
    }

    public String getTipo() {
        return tipo;
    }

    public String getNome() {
        return nome;
    }

    public String getFuso() {
        return fuso;
    }

    public boolean isAtiva() {
        return ativa;
    }

    public Instant getOcorridoEm() {
        return ocorridoEm;
    }
}
