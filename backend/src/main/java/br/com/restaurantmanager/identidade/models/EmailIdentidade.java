package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "email_identidade")
public class EmailIdentidade {
    @Id
    private UUID id;
    @Column(length = 20, nullable = false)
    private String tipo;
    @Column(length = 20, nullable = false)
    private String estado;
    @Column(name = "conteudo_cifrado", columnDefinition = "text")
    private String conteudoCifrado;
    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;
    @Column(name = "proxima_em", nullable = false)
    private Instant proximaEm;
    private UUID lease;
    private int tentativas;

    protected EmailIdentidade() {}

    private EmailIdentidade(UUID id, String tipo, String conteudo, Instant expiraEm) {
        this.id = id;
        this.tipo = tipo;
        this.conteudoCifrado = conteudo;
        this.expiraEm = expiraEm;
        this.estado = "PENDENTE";
        this.proximaEm = Instant.now();
    }

    public static EmailIdentidade criar(UUID id, String tipo, String conteudo, Instant expiraEm) {
        return new EmailIdentidade(id, tipo, conteudo, expiraEm);
    }

    public UUID getId() {
        return id;
    }

    public String getTipo() {
        return tipo;
    }

    public String getEstado() {
        return estado;
    }

    public String getConteudoCifrado() {
        return conteudoCifrado;
    }

    public Instant getExpiraEm() {
        return expiraEm;
    }

    public Instant getProximaEm() {
        return proximaEm;
    }

    public UUID getLease() {
        return lease;
    }

    public int getTentativas() {
        return tentativas;
    }

    public void prepararConteudo(String tipo, String conteudoCifrado) {
        this.tipo = tipo;
        this.conteudoCifrado = conteudoCifrado;
    }

    public void iniciarProcessamento(Instant agora) {
        estado = "PROCESSANDO";
        tentativas++;
        lease = UUID.randomUUID();
        proximaEm = agora.plusSeconds(120);
    }

    public void agendarNovaTentativa(Instant agora) {
        estado = "PENDENTE";
        proximaEm = agora.plusSeconds(30L * tentativas);
        lease = null;
    }

    public void finalizar(String estado) {
        this.estado = estado;
        conteudoCifrado = null;
        lease = null;
    }
}
