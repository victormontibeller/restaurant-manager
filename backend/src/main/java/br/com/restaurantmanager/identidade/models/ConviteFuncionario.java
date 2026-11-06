package br.com.restaurantmanager.identidade.models;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "convite_funcionario")
public class ConviteFuncionario {
    @Id
    private UUID id;
    @Column(name = "autor_id", nullable = false)
    private UUID autorId;
    @Column(nullable = false, length = 254)
    private String email;
    @Column(nullable = false, length = 20)
    private String perfil;
    @Column(nullable = false, length = 3700)
    private String unidades;
    @Column(name = "codigo_hash", length = 64)
    private String codigoHash;
    @Column(name = "criado_em", nullable = false)
    private Instant criadoEm;
    @Column(name = "expira_em", nullable = false)
    private Instant expiraEm;
    @Column(name = "aceito_em")
    private Instant aceitoEm;
    @Column(name = "revogado_em")
    private Instant revogadoEm;
    protected ConviteFuncionario() {}

    public List<UUID> vinculos() {
        return unidades.isEmpty() ? List.of() : Arrays.stream(unidades.split(",")).map(UUID::fromString).toList();
    }

    public String estado(Instant agora) {
        return aceitoEm != null ? "ACEITO" : revogadoEm != null ? "REVOGADO" : !expiraEm.isAfter(agora) ? "EXPIRADO" : "PENDENTE";
    }

    public UUID getId() {
        return id;
    }

    public UUID getAutorId() {
        return autorId;
    }

    public String getEmail() {
        return email;
    }

    public String getPerfil() {
        return perfil;
    }

    public String getUnidades() {
        return unidades;
    }

    public String getCodigoHash() {
        return codigoHash;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getExpiraEm() {
        return expiraEm;
    }

    public Instant getAceitoEm() {
        return aceitoEm;
    }

    public Instant getRevogadoEm() {
        return revogadoEm;
    }

    public static ConviteFuncionario criar(UUID id, UUID autor, String email, String perfil,
            String unidades, String codigoHash, Instant agora) {
        var convite = new ConviteFuncionario();
        convite.id = id;
        convite.autorId = autor;
        convite.email = email;
        convite.perfil = perfil;
        convite.unidades = unidades;
        convite.codigoHash = codigoHash;
        convite.criadoEm = agora;
        convite.expiraEm = agora.plusSeconds(900);
        return convite;
    }

    public void revogar(Instant agora) {
        revogadoEm = agora;
    }

    public void aceitar(Instant agora) {
        aceitoEm = agora;
    }
}
