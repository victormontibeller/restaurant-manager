package br.com.restaurantmanager.tenancy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.flywaydb.core.Flyway;

/** Processo exclusivo de migração; nunca é um bean ou servidor HTTP. */
public final class Migrations {
    private Migrations() {}

    public static List<String> run(Map<String, String> env) throws SQLException {
        String stage = env.get("RM_STAGE");
        if (!List.of("dev", "test", "hml").contains(stage == null ? "" : stage)) {
            throw new IllegalArgumentException("Ambiente de migração recusado.");
        }
        String database = "rm_" + stage;
        String owner = database + "_owner";
        String runtime = database + "_app";
        String url = "jdbc:postgresql://127.0.0.1:55432/" + database;
        if (!url.equals(env.get("RM_DB_URL")) || !owner.equals(env.get("RM_MIGRATION_USER"))
                || !runtime.equals(env.get("RM_DB_USER"))) {
            throw new IllegalArgumentException("Destino de migração recusado.");
        }
        var completed = new ArrayList<String>();
        try (var connection = DriverManager.getConnection(url, owner, env.get("RM_MIGRATION_PASSWORD"));
             var statement = connection.createStatement()) {
            verifyIdentity(connection, database, owner);
            try (var lock = statement.executeQuery("select pg_try_advisory_lock(7240100)")) {
                lock.next();
                if (!lock.getBoolean(1)) throw new IllegalStateException("Outro migrador está ativo.");
            }
            // A conexão mantém o lock de sessão até o final, inclusive em falha.
            migrate(url, owner, env.get("RM_MIGRATION_PASSWORD"), runtime, "public", connection);
            completed.add("public");
            for (String schema : tenantSchemas(connection)) {
                migrate(url, owner, env.get("RM_MIGRATION_PASSWORD"), runtime, schema, connection);
                completed.add(schema);
            }
        }
        return List.copyOf(completed);
    }

    /** Chamado pelo provisionador que já detém o mesmo advisory lock do migrador. */
    public static void migrateTenant(Connection guard, Map<String, String> env, String schema) throws SQLException {
        if (schema == null || !schema.matches("t_[a-f0-9]{32}")) {
            throw new IllegalArgumentException("Schema interno inválido.");
        }
        String stage = env.get("RM_STAGE");
        if (!List.of("dev", "test", "hml").contains(stage == null ? "" : stage)
                || !("jdbc:postgresql://127.0.0.1:55432/rm_" + stage).equals(env.get("RM_DB_URL"))
                || !("rm_" + stage + "_owner").equals(env.get("RM_MIGRATION_USER"))
                || !("rm_" + stage + "_app").equals(env.get("RM_DB_USER"))) {
            throw new IllegalArgumentException("Destino de migração recusado.");
        }
        verifyIdentity(guard, "rm_" + stage, "rm_" + stage + "_owner");
        try (var check = guard.createStatement(); var locks = check.executeQuery(
                "select exists(select 1 from pg_locks where locktype='advisory' and pid=pg_backend_pid() and granted and classid=0 and objid=7240100 and objsubid=1)")) {
            locks.next();
            if (!locks.getBoolean(1)) throw new IllegalStateException("Lock de migração obrigatório.");
        }
        try (var statement = guard.prepareStatement("select 1 from public.empresa where schema_name=? and estado in ('PROVISIONANDO','FALHOU')")) {
            statement.setString(1, schema);
            try (var result = statement.executeQuery()) {
                if (!result.next()) throw new IllegalStateException("Schema não reservado para provisionamento.");
            }
            migrate(env.get("RM_DB_URL"), env.get("RM_MIGRATION_USER"), env.get("RM_MIGRATION_PASSWORD"), env.get("RM_DB_USER"), schema, guard);
        }
    }

    public static void verifyIdentity(Connection connection, String database, String role) throws SQLException {
        try (var statement = connection.createStatement();
             var result = statement.executeQuery("select current_database(),current_user,inet_server_port(),host(inet_server_addr())")) {
            result.next();
            if (!database.equals(result.getString(1)) || !role.equals(result.getString(2))
                    || result.getInt(3) != 55432 || !"127.0.0.1".equals(result.getString(4))) {
                throw new IllegalStateException("Conexão efetiva recusada.");
            }
        }
    }

    static List<String> tenantSchemas(Connection connection) throws SQLException {
        return tenantSchemas(connection, true);
    }

    static List<String> tenantSchemas(Connection connection, boolean includeIncomplete) throws SQLException {
        var schemas = new ArrayList<String>();
        schemas.add("t_template");
        try (var statement = connection.createStatement();
             var result = statement.executeQuery("select schema_name from public.empresa"
                     + (includeIncomplete ? "" : " where estado in ('ATIVO','SUSPENSO')") + " order by id")) {
            while (result.next()) {
                String schema = result.getString(1);
                if (!schema.matches("t_[a-f0-9]{32}")) throw new IllegalStateException("Schema registrado inválido.");
                schemas.add(schema);
            }
        }
        return schemas;
    }

    private static void migrate(String url, String owner, String password, String runtime, String schema,
                                Connection connection) throws SQLException {
        Flyway.configure().dataSource(url, owner, password).defaultSchema(schema).schemas(schema)
                .locations("classpath:db/migration/" + (schema.equals("public") ? "public" : "tenant"))
                .placeholders(Map.of("runtimeRole", runtime)).cleanDisabled(true).load().migrate();
        try (var statement = connection.createStatement()) {
            statement.execute("GRANT SELECT ON " + schema + ".flyway_schema_history TO " + runtime);
        }
        System.out.println("Migração validada: " + schema);
    }
}
