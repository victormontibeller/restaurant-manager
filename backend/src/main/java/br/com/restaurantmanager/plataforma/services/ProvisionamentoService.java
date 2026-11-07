package br.com.restaurantmanager.plataforma.services;

import br.com.restaurantmanager.identidade.services.PoliticaSenha;
import br.com.restaurantmanager.plataforma.dtos.PedidoProvisionamento;
import br.com.restaurantmanager.plataforma.dtos.ResultadoProvisionamento;
import br.com.restaurantmanager.plataforma.models.DominioPlataforma;
import br.com.restaurantmanager.plataforma.repositories.ProvisionamentoRepository;
import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** Caso de uso privilegiado executado fora do servidor HTTP; não é um bean runtime. */
public final class ProvisionamentoService {
    private final ProvisionamentoRepository repository;
    private final DominioPlataforma plataforma;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);

    public ProvisionamentoService(Map<String, String> env) {
        repository = new ProvisionamentoRepository(env);
        plataforma = new DominioPlataforma(env.getOrDefault("RM_PLATFORM_HOST", DominioPlataforma.PADRAO));
    }

    public ResultadoProvisionamento provisionar(PedidoProvisionamento pedido) throws SQLException {
        reservar(pedido);
        return concluir(pedido.id());
    }

    public void reservar(PedidoProvisionamento pedido) throws SQLException {
        validar(pedido);
        plataforma.exigirDisponivel(pedido.host());
        try (var connection = repository.abrirComLock()) {
            if (repository.reservadoNaFila(connection, pedido.id(), pedido.host())) {
                throw new IllegalStateException("Reserva pertence à fila SaaS; processe a solicitação original.");
            }
            var existing = repository.buscar(connection, pedido.id());
            if (existing != null) {
                if (!existing.nome().equals(pedido.nome()) || !existing.host().equals(pedido.host())
                        || !existing.unidade().equals(pedido.unidade()) || !existing.email().equals(pedido.email())
                        || !passwords.matches(pedido.senha(), existing.hash())) {
                    throw new IllegalStateException("Identificador reutilizado com dados diferentes.");
                }
                return;
            }
            connection.setAutoCommit(false);
            try {
                repository.reservar(connection, pedido, passwords.encode(pedido.senha()));
                connection.commit();
            } catch (SQLException failure) {
                connection.rollback();
                if ("23505".equals(failure.getSQLState())) {
                    throw new IllegalStateException("Identificador ou domínio já reservado.");
                }
                throw failure;
            }
        }
    }

    public ResultadoProvisionamento concluir(UUID id) throws SQLException {
        if (id == null) {
            throw new IllegalArgumentException("Identificador obrigatório.");
        }
        try (var connection = repository.abrirComLock()) {
            return concluir(connection, id);
        }
    }

    /** A fila é durável; falha exige retomada explícita, sem retry infinito. */
    public ResultadoProvisionamento processarSolicitacao(UUID id) throws SQLException {
        if (id == null) {
            throw new IllegalArgumentException("Identificador obrigatório.");
        }
        try (var connection = repository.abrirComLock()) {
            var pedido = repository.solicitacao(connection, id);
            if (pedido == null) {
                throw new IllegalArgumentException("Solicitação não encontrada.");
            }
            plataforma.exigirDisponivel(pedido.host());
            if (pedido.estado().equals("FALHOU")) {
                throw new IllegalStateException("Solicite retomada pela plataforma.");
            }
            try {
                var existente = repository.buscar(connection, id);
                if (existente == null) {
                    connection.setAutoCommit(false);
                    repository.reservar(connection, new PedidoProvisionamento(id, pedido.nome(), pedido.host(),
                            pedido.unidade(), pedido.email(), null), pedido.hash());
                    connection.commit();
                    connection.setAutoCommit(true);
                } else if (!existente.nome().equals(pedido.nome()) || !existente.host().equals(pedido.host())
                        || !existente.unidade().equals(pedido.unidade()) || !existente.email().equals(pedido.email())
                        || !existente.hash().equals(pedido.hash())) {
                    throw new IllegalStateException("Reserva divergente da solicitação.");
                }
                // Um resultado já concluído não reativa empresa suspensa posteriormente.
                ResultadoProvisionamento resultado = existente != null
                        && List.of("ATIVO", "SUSPENSO").contains(existente.estado())
                        ? new ResultadoProvisionamento(id, existente.schema(), existente.estado())
                        : concluir(connection, id);
                connection.setAutoCommit(false);
                repository.finalizarSolicitacao(connection, id, "CONCLUIDO", null);
                connection.commit();
                return resultado;
            } catch (SQLException | RuntimeException failure) {
                if (!connection.getAutoCommit()) {
                    connection.rollback();
                }
                connection.setAutoCommit(false);
                repository.finalizarSolicitacao(connection, id, "FALHOU", "PROVISIONAMENTO_INTERROMPIDO");
                connection.commit();
                throw new IllegalStateException(
                        "Solicitação interrompida; consulte o estado e solicite retomada.", failure);
            }
        }
    }

    private ResultadoProvisionamento concluir(Connection connection, UUID id) throws SQLException {
        var registro = repository.buscar(connection, id);
        if (registro == null) {
            throw new IllegalArgumentException("Provisionamento não encontrado.");
        }
        plataforma.exigirDisponivel(registro.host());
        if (registro.estado().equals("ATIVO")) {
            return new ResultadoProvisionamento(id, registro.schema(), "ATIVO");
        }
        if (!List.of("PROVISIONANDO", "FALHOU").contains(registro.estado())) {
            throw new IllegalStateException("Estado empresarial não permite provisionamento.");
        }
        try {
            repository.migrar(connection, registro);
            connection.setAutoCommit(false);
            repository.ativar(connection, registro);
            connection.commit();
        } catch (SQLException | RuntimeException failure) {
            String code = failure instanceof SQLException sql && sql.getSQLState() != null
                    && sql.getSQLState().matches("[A-Z0-9]{5}")
                    ? "SQLSTATE_" + sql.getSQLState() : "MIGRACAO_OU_ATIVACAO";
            try {
                if (!connection.getAutoCommit()) {
                    connection.rollback();
                }
                connection.setAutoCommit(false);
                repository.falhar(connection, id, code);
                connection.commit();
            } catch (SQLException diagnosticFailure) {
                failure.addSuppressed(diagnosticFailure);
            }
            throw new IllegalStateException("Provisionamento interrompido; pode ser retomado.", failure);
        }
        return new ResultadoProvisionamento(id, registro.schema(), "ATIVO");
    }

    static void validar(PedidoProvisionamento pedido) {
        if (pedido == null || pedido.id() == null) {
            throw new IllegalArgumentException("Identificador obrigatório.");
        }
        texto(pedido.nome(), "Nome");
        texto(pedido.unidade(), "Unidade");
        if (pedido.host() == null || pedido.host().length() > 253
                || !pedido.host().matches("[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.localhost")) {
            throw new IllegalArgumentException("Domínio local inválido; não informe porta ou schema.");
        }
        if (pedido.email() == null || pedido.email().length() > 254
                || !pedido.email().matches("[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\\.[a-z0-9-]+)+")) {
            throw new IllegalArgumentException("E-mail normalizado inválido.");
        }
        if (!PoliticaSenha.novaSenhaValida(pedido.senha())) {
            throw new IllegalArgumentException("Senha deve ter pelo menos 12 caracteres e no máximo 72 bytes.");
        }
    }

    private static void texto(String value, String field) {
        if (value == null || value.isBlank() || !value.equals(value.strip()) || value.length() > 120
                || value.chars().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(field + " inválido.");
        }
    }
}
