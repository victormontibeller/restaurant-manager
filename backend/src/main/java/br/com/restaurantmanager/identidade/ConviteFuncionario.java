package br.com.restaurantmanager.identidade;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name="convite_funcionario")
public class ConviteFuncionario {
    @Id UUID id;
    @Column(name="autor_id",nullable=false) UUID autorId;
    @Column(nullable=false,length=254) String email;
    @Column(nullable=false,length=20) String perfil;
    @Column(nullable=false,length=3700) String unidades;
    @Column(name="codigo_hash",length=64) String codigoHash;
    @Column(name="criado_em",nullable=false) Instant criadoEm;
    @Column(name="expira_em",nullable=false) Instant expiraEm;
    @Column(name="aceito_em") Instant aceitoEm;
    @Column(name="revogado_em") Instant revogadoEm;
    protected ConviteFuncionario() {}
    List<UUID> vinculos() {return unidades.isEmpty()?List.of():java.util.Arrays.stream(unidades.split(",")).map(UUID::fromString).toList();}
    String estado(Instant agora) {return aceitoEm!=null?"ACEITO":revogadoEm!=null?"REVOGADO":!expiraEm.isAfter(agora)?"EXPIRADO":"PENDENTE";}
}
