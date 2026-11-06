package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name = "politica_acesso")
public class PoliticaAcesso {
    @Id
    private int id;
    @Version
    private long versao;
    protected PoliticaAcesso() {}

    public int getId() {
        return id;
    }

    public long getVersao() {
        return versao;
    }
}
