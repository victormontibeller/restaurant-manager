package br.com.restaurantmanager.unidades;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.util.UUID;

@Entity
@Table(name = "unidade")
public class Unidade {
    @Id private UUID id;
    private String nome;
    private String fuso;
    private boolean ativa;
    @Version private long versao;
    protected Unidade() {}
    public UUID getId() { return id; }
    public String getNome() { return nome; }
    public String getFuso() { return fuso; }
}
