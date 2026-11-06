package br.com.restaurantmanager.identidade;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.Version;

@Entity
@Table(name="politica_acesso")
public class PoliticaAcesso {
    @Id int id;
    @Version long versao;
    protected PoliticaAcesso() {}
}
