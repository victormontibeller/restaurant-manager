package br.com.restaurantmanager.plataforma.repositories;

import br.com.restaurantmanager.plataforma.dtos.PedidoProvisionamento;
import br.com.restaurantmanager.plataforma.dtos.RegistroProvisionamento;
import br.com.restaurantmanager.plataforma.dtos.RegistroSolicitacaoProvisionamento;
import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Persistência de infraestrutura privilegiada, fora do pool/runtime HTTP. */
public final class ProvisionamentoRepository {
    private final Map<String, String> env;

    public ProvisionamentoRepository(Map<String, String> env) {
        this.env = Map.copyOf(env);
    }

    public Connection abrirComLock() throws SQLException {
        String stage = env.get("RM_STAGE");
        validarDestino(env);
        var connection = DriverManager.getConnection(env.get("RM_DB_URL"),
                env.get("RM_MIGRATION_USER"), env.get("RM_MIGRATION_PASSWORD"));
        try {
            Migrations.verifyIdentity(connection, "rm_" + stage, "rm_" + stage + "_owner");
            try (var statement = connection.createStatement();
                    var result = statement.executeQuery("select pg_try_advisory_lock(7240100)")) {
                result.next();
                if (!result.getBoolean(1)) {
                    throw new IllegalStateException("Outro migrador ou provisionador está ativo.");
                }
            }
            return connection;
        } catch (SQLException | RuntimeException failure) {
            connection.close();
            throw failure;
        }
    }

    public static void validarDestino(Map<String, String> env) {
        String stage = env.get("RM_STAGE");
        // Opt-in técnico local após manutenção; não exportado ao runtime HTTP.
        boolean homologacao = "hml".equals(stage) && "true".equals(env.get("RM_HML_PROVISIONING_ENABLED"));
        if ((!List.of("dev", "test").contains(stage == null ? "" : stage) && !homologacao)
                || !("jdbc:postgresql://127.0.0.1:55432/rm_" + stage).equals(env.get("RM_DB_URL"))
                || !("rm_" + stage + "_owner").equals(env.get("RM_MIGRATION_USER"))
                || !("rm_" + stage + "_app").equals(env.get("RM_DB_USER"))) {
            throw new IllegalArgumentException("Destino de provisionamento recusado.");
        }
    }

    public RegistroProvisionamento buscar(Connection connection, UUID id) throws SQLException {
        try (var statement = connection.prepareStatement("select e.nome,e.schema_name,e.estado,p.host,p.unidade_nome,p.administrador_email,p.administrador_senha_hash from public.empresa e join public.provisionamento p on p.empresa_id=e.id where e.id=?")) {
            statement.setObject(1, id);
            try (var result = statement.executeQuery()) {
                if (!result.next()) {
                    return null;
                }
                return new RegistroProvisionamento(id, result.getString(1), result.getString(2),
                        result.getString(3), result.getString(4), result.getString(5),
                        result.getString(6), result.getString(7));
            }
        }
    }

    public void reservar(Connection connection, PedidoProvisionamento pedido, String hash) throws SQLException {
        try (var statement = connection.prepareStatement("insert into public.empresa(id,nome,schema_name,estado) values (?,?,?,'PROVISIONANDO')")) {
            statement.setObject(1, pedido.id());
            statement.setString(2, pedido.nome());
            statement.setString(3, schema(pedido.id()));
            statement.executeUpdate();
        }
        try (var statement = connection.prepareStatement("insert into public.dominio(host,empresa_id) values (?,?)")) {
            statement.setString(1, pedido.host());
            statement.setObject(2, pedido.id());
            statement.executeUpdate();
        }
        try (var statement = connection.prepareStatement("insert into public.provisionamento(empresa_id,host,unidade_nome,administrador_email,administrador_senha_hash) values (?,?,?,?,?)")) {
            statement.setObject(1, pedido.id());
            statement.setString(2, pedido.host());
            statement.setString(3, pedido.unidade());
            statement.setString(4, pedido.email());
            statement.setString(5, hash);
            statement.executeUpdate();
        }
        auditar(connection, pedido.id(), "RESERVADO");
    }

    public void migrar(Connection guard, RegistroProvisionamento registro) throws SQLException {
        if (!registro.schema().equals(schema(registro.id()))) {
            throw new IllegalStateException("Schema empresarial divergente.");
        }
        Migrations.migrateTenant(guard, env, registro.schema());
    }

    public void ativar(Connection connection, RegistroProvisionamento registro) throws SQLException {
        String schema = schema(registro.id());
        try (var statement = connection.prepareStatement("insert into " + schema + ".unidade(id,nome) values (?,?)")) {
            statement.setObject(1, UUID.randomUUID());
            statement.setString(2, registro.unidade());
            statement.executeUpdate();
        }
        try (var statement = connection.prepareStatement("insert into " + schema + ".usuario(id,email,senha_hash,perfil) values (?,?,?,'ADMINISTRADOR')")) {
            statement.setObject(1, UUID.randomUUID());
            statement.setString(2, registro.email());
            statement.setString(3, registro.hash());
            statement.executeUpdate();
        }
        try (var statement = connection.prepareStatement("update public.empresa set estado='ATIVO',versao=versao+1 where id=? and estado in ('PROVISIONANDO','FALHOU')")) {
            statement.setObject(1, registro.id());
            if (statement.executeUpdate() != 1) {
                throw new IllegalStateException("Estado de provisionamento conflitante.");
            }
        }
        try (var statement = connection.prepareStatement("update public.provisionamento set ultima_falha=null,atualizado_em=now() where empresa_id=?")) {
            statement.setObject(1, registro.id());
            statement.executeUpdate();
        }
        auditar(connection, registro.id(), "ATIVADO");
    }

    public void falhar(Connection connection, UUID id, String codigo) throws SQLException {
        try (var statement = connection.prepareStatement("update public.empresa set estado='FALHOU',versao=versao+1 where id=? and estado in ('PROVISIONANDO','FALHOU')")) {
            statement.setObject(1, id);
            statement.executeUpdate();
        }
        try (var statement = connection.prepareStatement("update public.provisionamento set ultima_falha=?,atualizado_em=now() where empresa_id=?")) {
            statement.setString(1, codigo);
            statement.setObject(2, id);
            statement.executeUpdate();
        }
        auditar(connection, id, "FALHOU");
    }

    private void auditar(Connection connection, UUID id, String evento) throws SQLException {
        try (var statement = connection.prepareStatement("insert into public.auditoria_provisionamento(id,empresa_id,evento) values (?,?,?)")) {
            statement.setObject(1, UUID.randomUUID());
            statement.setObject(2, id);
            statement.setString(3, evento);
            statement.executeUpdate();
        }
    }

    public static String schema(UUID id) {
        return "t_" + id.toString().replace("-", "");
    }

    public RegistroSolicitacaoProvisionamento solicitacao(Connection connection, UUID id) throws SQLException {
        try (var statement = connection.prepareStatement("select id,operador_id,nome,host,unidade_nome,administrador_email,administrador_senha_hash,estado,versao,ultima_falha from public.solicitacao_provisionamento where id=?")) {
            statement.setObject(1, id);
            try (var result = statement.executeQuery()) {
                if (!result.next()) {
                    return null;
                }
                return new RegistroSolicitacaoProvisionamento(result.getObject(1, UUID.class),
                        result.getObject(2, UUID.class), result.getString(3), result.getString(4),
                        result.getString(5), result.getString(6), result.getString(7), result.getString(8),
                        result.getLong(9), result.getString(10));
            }
        }
    }

    public boolean reservadoNaFila(Connection connection, UUID id, String host) throws SQLException {
        try (var statement = connection.prepareStatement("select exists(select 1 from public.solicitacao_provisionamento where id=? or host=?)")) {
            statement.setObject(1, id);
            statement.setString(2, host);
            try (var result = statement.executeQuery()) {
                result.next();
                return result.getBoolean(1);
            }
        }
    }

    public void finalizarSolicitacao(Connection connection, UUID id, String estado, String falha) throws SQLException {
        try (var statement = connection.prepareStatement("update public.solicitacao_provisionamento set estado=?,versao=versao+1,ultima_falha=?,atualizado_em=clock_timestamp() where id=? and estado='SOLICITADO'")) {
            statement.setString(1, estado);
            statement.setString(2, falha);
            statement.setObject(3, id);
            statement.executeUpdate();
        }
    }
}
