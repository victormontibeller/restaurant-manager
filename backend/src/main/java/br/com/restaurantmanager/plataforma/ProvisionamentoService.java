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
    }

    private static void validar(Pedido p) {
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
