package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "cadastro_cliente")
public class CadastroCliente {
    @Id
    @Column(length = 64)
    private String hash;
    @Column(length = 254, nullable = false)
    private String email;
    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;
    @Column(name = "consumido_em")
    private Instant consumidoEm;
    protected CadastroCliente() {}

    private CadastroCliente(String hash, String email, Instant expiraEm) {
        this.hash = hash;
        this.email = email;
        this.expiraEm = expiraEm;
    }

    public static CadastroCliente criar(String hash, String email, Instant expiraEm) {
        return new CadastroCliente(hash, email, expiraEm);
    }

    public String getHash() {
        return hash;
    }

    public String getEmail() {
        return email;
    }

    public Instant getExpiraEm() {
        return expiraEm;
    }

    public Instant getConsumidoEm() {
        return consumidoEm;
    }
}
