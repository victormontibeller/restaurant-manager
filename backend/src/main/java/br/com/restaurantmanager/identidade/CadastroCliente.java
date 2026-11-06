package br.com.restaurantmanager.identidade;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name="cadastro_cliente")
public class CadastroCliente {
    @Id @Column(length=64) String hash;
    @Column(length=254,nullable=false) String email;
    @Column(name="expira_em",nullable=false) Instant expiraEm;
    @Column(name="consumido_em") Instant consumidoEm;
    protected CadastroCliente() {}
    CadastroCliente(String hash,String email,Instant expiraEm) {
        this.hash=hash;this.email=email;this.expiraEm=expiraEm;
    }
}
