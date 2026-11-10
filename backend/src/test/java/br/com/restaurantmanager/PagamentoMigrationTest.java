package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;

class PagamentoMigrationTest {
    private static final OffsetDateTime INICIO = OffsetDateTime.parse("2026-11-01T12:00:00Z");

    @Test
    void upgradePreservaCorrenteEPermiteReconciliarHistoricosSemLiberarDuasCorrentes()
            throws Exception {
        TestDatabase.prepare();
        String schema = "t_" + UUID.randomUUID().toString().replace("-", "");
        UUID unidade = UUID.randomUUID();
        UUID usuario = UUID.randomUUID();
        UUID conexao = UUID.randomUUID();
        try (var connection = owner()) {
            executar(connection, "create schema " + schema);
            try {
                assertThat(migrar(schema, "27").info().current().getVersion().toString())
                        .isEqualTo("27");
                executar(connection, "insert into " + schema + ".unidade(id,nome) values (?,?)",
                        unidade, "Unidade fictícia da migração");
                executar(connection, "insert into " + schema
                                + ".usuario(id,email,senha_hash,perfil) values (?,?,'inutilizavel','CLIENTE')",
                        usuario, usuario + "@example.invalid");
                executar(connection, "insert into " + schema
                                + ".mp_conexao(id,vendedor,credencial,expira_em) values (?,?,'cifra-ficticia',now()+interval '1 hour')",
                        conexao, conexao.toString());

                var casos = new ArrayList<Historico>();
                for (String estado : List.of("SOLICITADO", "AGUARDANDO", "EM_RECONCILIACAO", "BLOQUEADO")) {
                    UUID pedido = pedido(connection, schema, unidade, usuario);
                    UUID corrente = UUID.randomUUID();
                    UUID recusadaMaisNova = UUID.randomUUID();
                    UUID confirmadaMaisNova = UUID.randomUUID();
                    checkout(connection, schema, corrente, pedido, conexao, estado, INICIO);
                    checkout(connection, schema, recusadaMaisNova, pedido, conexao, "RECUSADO", INICIO.plusSeconds(1));
                    checkout(connection, schema, confirmadaMaisNova, pedido, conexao, "CONFIRMADO", INICIO.plusSeconds(2));
                    casos.add(new Historico(pedido, corrente, estado,
                            List.of(recusadaMaisNova, confirmadaMaisNova)));
                }
                UUID pedidoSemAtiva = pedido(connection, schema, unidade, usuario);
                UUID antiga = UUID.randomUUID();
                UUID recente = UUID.randomUUID();
                checkout(connection, schema, antiga, pedidoSemAtiva, conexao, "RECUSADO", INICIO);
                checkout(connection, schema, recente, pedidoSemAtiva, conexao, "RECUSADO", INICIO.plusSeconds(1));
                casos.add(new Historico(pedidoSemAtiva, recente, "RECUSADO", List.of(antiga)));

                UUID pedidoEmpatado = pedido(connection, schema, unidade, usuario);
                UUID menor = UUID.fromString("00000000-0000-4000-8000-000000000001");
                UUID maior = UUID.fromString("00000000-0000-4000-8000-000000000002");
                checkout(connection, schema, menor, pedidoEmpatado, conexao, "RECUSADO", INICIO);
                checkout(connection, schema, maior, pedidoEmpatado, conexao, "RECUSADO", INICIO);
                casos.add(new Historico(pedidoEmpatado, maior, "RECUSADO", List.of(menor)));

                UUID historicoBloqueadoAntesDoUpgrade = casos.getFirst().substituidas().getFirst();
                assertThatThrownBy(() -> estado(connection, schema, historicoBloqueadoAntesDoUpgrade, "EM_RECONCILIACAO"))
                        .isInstanceOf(SQLException.class)
                        .hasMessageContaining("pagamento_pedido_ativo")
                        .satisfies(erro -> assertThat(((SQLException) erro).getSQLState()).isEqualTo("23505"));

                var atualizado = migrar(schema, "28");
                assertThat(atualizado.info().current().getVersion().toString()).isEqualTo("28");
                for (var caso : casos) {
                    assertThat(checkouts(connection, schema, caso.pedido(), false))
                            .containsExactly(caso.corrente());
                    assertThat(checkouts(connection, schema, caso.pedido(), true))
                            .containsExactlyInAnyOrderElementsOf(caso.substituidas());
                    assertThat(estado(connection, schema, caso.corrente())).isEqualTo(caso.estado());

                    // Mesmo com corrente ativa, os históricos agora podem voltar à reconciliação.
                    estado(connection, schema, caso.corrente(), "AGUARDANDO");
                    for (UUID id : caso.substituidas()) {
                        estado(connection, schema, id, "EM_RECONCILIACAO");
                        assertThat(estado(connection, schema, id)).isEqualTo("EM_RECONCILIACAO");
                    }
                    assertThatThrownBy(() -> checkout(connection, schema, UUID.randomUUID(),
                            caso.pedido(), conexao, "SOLICITADO", INICIO.plusSeconds(3)))
                            .isInstanceOf(SQLException.class)
                            .hasMessageContaining("pagamento_pedido_ativo")
                            .satisfies(erro -> assertThat(((SQLException) erro).getSQLState()).isEqualTo("23505"));
                    assertThat(checkouts(connection, schema, caso.pedido(), false))
                            .containsExactly(caso.corrente());
                    assertThat(checkouts(connection, schema, caso.pedido(), true))
                            .containsExactlyInAnyOrderElementsOf(caso.substituidas());
                }
                assertThat(atualizado.migrate().migrationsExecuted).isZero();
            } finally {
                // O CREATE acima falha se existir; somente o schema UUID desta execução é removido.
                Migrations.verifyIdentity(connection, "rm_test", "rm_test_owner");
                executar(connection, "drop schema " + schema + " cascade");
            }
        }
    }

    private Connection owner() throws SQLException {
        var connection = DriverManager.getConnection(System.getenv("RM_DB_URL"),
                System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
        try {
            Migrations.verifyIdentity(connection, "rm_test", "rm_test_owner");
            return connection;
        } catch (SQLException | RuntimeException erro) {
            connection.close();
            throw erro;
        }
    }

    private Flyway migrar(String schema, String target) {
        var flyway = Flyway.configure()
                .dataSource(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"),
                        System.getenv("RM_MIGRATION_PASSWORD"))
                .defaultSchema(schema).schemas(schema)
                .locations("classpath:db/migration/tenant")
                .placeholders(Map.of("runtimeRole", System.getenv("RM_DB_USER")))
                .target(target).cleanDisabled(true).load();
        flyway.migrate();
        return flyway;
    }

    private UUID pedido(Connection connection, String schema, UUID unidade, UUID usuario)
            throws SQLException {
        UUID id = UUID.randomUUID();
        executar(connection, "insert into " + schema
                        + ".pedido(id,unidade_id,usuario_id,autoria,canal,estado,criado_em,linhas,payload,pago_online,pagamento_expira_em)"
                        + " values (?,?,?,'CLIENTE','RETIRADA','AGUARDANDO_PAGAMENTO',now(),'[{\"quantidade\":1}]'::jsonb,'fixture-migracao',true,now()+interval '5 minutes')",
                id, unidade, usuario);
        return id;
    }

    private void checkout(Connection connection, String schema, UUID id, UUID pedido, UUID conexao,
            String estado, OffsetDateTime criadoEm) throws SQLException {
        executar(connection, "insert into " + schema
                        + ".pagamento_checkout(id,pedido_id,conexao_id,valor,externo_id,enviado,estado,criado_em,proximo_em,retorno_url,prazo_segundos)"
                        + " values (?,?,?,20,?,true,?,?,now(),'https://migration.localhost/pedidos',300)",
                id, pedido, conexao, id.toString(), estado, criadoEm);
    }

    private List<UUID> checkouts(Connection connection, String schema, UUID pedido, boolean substituida)
            throws SQLException {
        try (var statement = connection.prepareStatement("select id from " + schema
                + ".pagamento_checkout where pedido_id=? and substituida=? order by id")) {
            statement.setObject(1, pedido);
            statement.setBoolean(2, substituida);
            try (var rows = statement.executeQuery()) {
                var ids = new ArrayList<UUID>();
                while (rows.next()) ids.add(rows.getObject(1, UUID.class));
                return ids;
            }
        }
    }

    private String estado(Connection connection, String schema, UUID id) throws SQLException {
        try (var statement = connection.prepareStatement("select estado from " + schema
                + ".pagamento_checkout where id=?")) {
            statement.setObject(1, id);
            try (var rows = statement.executeQuery()) {
                assertThat(rows.next()).isTrue();
                return rows.getString(1);
            }
        }
    }

    private void estado(Connection connection, String schema, UUID id, String estado) throws SQLException {
        executar(connection, "update " + schema + ".pagamento_checkout set estado=? where id=?", estado, id);
    }

    private void executar(Connection connection, String sql, Object... parameters) throws SQLException {
        try (var statement = connection.prepareStatement(sql)) {
            for (int index = 0; index < parameters.length; index++) statement.setObject(index + 1, parameters[index]);
            statement.executeUpdate();
        }
    }

    private record Historico(UUID pedido, UUID corrente, String estado, List<UUID> substituidas) {}
}
