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
    @jakarta.persistence.Column(name="criacao_payload",updatable=false,columnDefinition="text")
    private String criacaoPayload;
    @Version private long versao;
    protected Unidade() {}
    public UUID getId() { return id; }
    public String getNome() { return nome; }
    public String getFuso() { return fuso; }
    public boolean isAtiva() { return ativa; }
    public long getVersao() { return versao; }
    String getCriacaoPayload() { return criacaoPayload; }
    Unidade(UUID id,String nome,String fuso,boolean ativa,String criacaoPayload) {
        this.id=id;this.nome=nome;this.fuso=fuso;this.ativa=ativa;this.criacaoPayload=criacaoPayload;
    }
    void alterar(String nome,String fuso,boolean ativa) {this.nome=nome;this.fuso=fuso;this.ativa=ativa;}
}
