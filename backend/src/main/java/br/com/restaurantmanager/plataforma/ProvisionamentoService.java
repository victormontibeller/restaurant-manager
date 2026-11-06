package br.com.restaurantmanager.plataforma;

import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** Caso de uso privilegiado executado fora do servidor HTTP; não é um bean runtime. */
public final class ProvisionamentoService {
    private final ProvisionamentoRepository repository;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);

    public ProvisionamentoService(Map<String, String> env) {
        repository = new ProvisionamentoRepository(env);
    }

    public Resultado provisionar(Pedido pedido) throws SQLException {
        reservar(pedido);
        return concluir(pedido.id());
    }

    public void reservar(Pedido pedido) throws SQLException {
        validar(pedido);
        try (var c = repository.abrirComLock()) {
            if(repository.reservadoNaFila(c,pedido.id(),pedido.host()))
                throw new IllegalStateException("Reserva pertence à fila SaaS; processe a solicitação original.");
            var existing = repository.buscar(c, pedido.id());
            if (existing != null) {
                if (!existing.nome().equals(pedido.nome()) || !existing.host().equals(pedido.host())
                        || !existing.unidade().equals(pedido.unidade()) || !existing.email().equals(pedido.email())
                        || !passwords.matches(pedido.senha(), existing.hash())) {
                    throw new IllegalStateException("Identificador reutilizado com dados diferentes.");
                }
                return;
            }
            c.setAutoCommit(false);
            try {
                repository.reservar(c, pedido, passwords.encode(pedido.senha()));
                c.commit();
            } catch (SQLException failure) {
                c.rollback();
                if ("23505".equals(failure.getSQLState())) throw new IllegalStateException("Identificador ou domínio já reservado.");
                throw failure;
            }
        }
    }

    public Resultado concluir(UUID id) throws SQLException {
        if (id == null) throw new IllegalArgumentException("Identificador obrigatório.");
        try (var c = repository.abrirComLock()) {
            return concluir(c,id);
        }
    }

    /** A fila é durável; falha exige retomada explícita, sem retry infinito. */
    public Resultado processarSolicitacao(UUID id) throws SQLException {
        if(id==null)throw new IllegalArgumentException("Identificador obrigatório.");
        try(var c=repository.abrirComLock()) {
            var pedido=repository.solicitacao(c,id);
            if(pedido==null)throw new IllegalArgumentException("Solicitação não encontrada.");
            if(pedido.estado().equals("FALHOU"))throw new IllegalStateException("Solicite retomada pela plataforma.");
            try {
                var existente=repository.buscar(c,id);
                if(existente==null) {
                    c.setAutoCommit(false);
                    repository.reservar(c,new Pedido(id,pedido.nome(),pedido.host(),pedido.unidade(),pedido.email(),null),pedido.hash());
                    c.commit();c.setAutoCommit(true);
                } else if(!existente.nome().equals(pedido.nome()) || !existente.host().equals(pedido.host())
                        || !existente.unidade().equals(pedido.unidade()) || !existente.email().equals(pedido.email()) || !existente.hash().equals(pedido.hash())) {
                    throw new IllegalStateException("Reserva divergente da solicitação.");
                }
                // Um resultado já concluído não reativa empresa suspensa posteriormente.
                Resultado resultado=existente!=null && java.util.List.of("ATIVO","SUSPENSO").contains(existente.estado())
                        ? new Resultado(id,existente.schema(),existente.estado()) : concluir(c,id);
                c.setAutoCommit(false);repository.finalizarSolicitacao(c,id,"CONCLUIDO",null);c.commit();return resultado;
            }catch(SQLException | RuntimeException failure) {
                if(!c.getAutoCommit())c.rollback();c.setAutoCommit(false);
                repository.finalizarSolicitacao(c,id,"FALHOU","PROVISIONAMENTO_INTERROMPIDO");c.commit();
                throw new IllegalStateException("Solicitação interrompida; consulte o estado e solicite retomada.",failure);
            }
        }
    }

    private Resultado concluir(java.sql.Connection c,UUID id) throws SQLException {
            var registro = repository.buscar(c, id);
            if (registro == null) throw new IllegalArgumentException("Provisionamento não encontrado.");
            if (registro.estado().equals("ATIVO")) return new Resultado(id, registro.schema(), "ATIVO");
            if (!java.util.List.of("PROVISIONANDO", "FALHOU").contains(registro.estado())) {
                throw new IllegalStateException("Estado empresarial não permite provisionamento.");
            }
            try {
                repository.migrar(c, registro);
                c.setAutoCommit(false);
                repository.ativar(c, registro);
                c.commit();
            } catch (SQLException | RuntimeException failure) {
                String code = failure instanceof SQLException sql && sql.getSQLState() != null
                        && sql.getSQLState().matches("[A-Z0-9]{5}") ? "SQLSTATE_" + sql.getSQLState() : "MIGRACAO_OU_ATIVACAO";
                try {
                    if (!c.getAutoCommit()) c.rollback();
                    c.setAutoCommit(false);
                    repository.falhar(c, id, code);
                    c.commit();
                } catch (SQLException diagnosticFailure) {
                    failure.addSuppressed(diagnosticFailure);
                }
                throw new IllegalStateException("Provisionamento interrompido; pode ser retomado.", failure);
            }
            return new Resultado(id, registro.schema(), "ATIVO");
    }

    static void validar(Pedido p) {
        if (p == null || p.id() == null) throw new IllegalArgumentException("Identificador obrigatório.");
        texto(p.nome(), "Nome"); texto(p.unidade(), "Unidade");
        if (p.host() == null || p.host().length() > 253
                || !p.host().matches("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.localhost")) {
            throw new IllegalArgumentException("Domínio local inválido; não informe porta ou schema.");
        }
        if (p.email() == null || p.email().length() > 254
                || !p.email().matches("[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\\.[a-z0-9-]+)+")) {
            throw new IllegalArgumentException("E-mail normalizado inválido.");
        }
        if (p.senha() == null || p.senha().length() < 12 || p.senha().getBytes(StandardCharsets.UTF_8).length > 72) {
            throw new IllegalArgumentException("Senha deve ter pelo menos 12 caracteres e no máximo 72 bytes.");
        }
    }

    private static void texto(String value, String field) {
        if (value == null || value.isBlank() || !value.equals(value.strip()) || value.length() > 120
                || value.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(field + " inválido.");
        }
    }

    public record Pedido(UUID id, String nome, String host, String unidade, String email, String senha) {
        @Override public String toString() { return "PedidoProvisionamento[" + id + "]"; }
    }
    public record Resultado(UUID id, String schema, String estado) {}
}
