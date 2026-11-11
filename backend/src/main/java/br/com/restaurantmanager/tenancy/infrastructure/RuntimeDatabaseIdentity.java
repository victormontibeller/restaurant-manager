package br.com.restaurantmanager.tenancy.infrastructure;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.List;

/** Guarda de runtime; não altera a allowlist dos comandos privilegiados. */
public final class RuntimeDatabaseIdentity {
    private static final String SHARED_DEV_URL = "jdbc:postgresql://127.0.0.1:5432/rm_dev";

    private RuntimeDatabaseIdentity() {}

    public static void verify(Connection connection, String stage, String role, boolean recoveryTest,
                              String databaseUrl) throws SQLException {
        if (!List.of("dev", "test", "hml").contains(stage) || !role.equals("rm_" + stage + "_app")) {
            throw new IllegalStateException("Identidade de runtime recusada.");
        }
        boolean sharedDev = "dev".equals(stage) && SHARED_DEV_URL.equals(databaseUrl);
        if (!recoveryTest && !sharedDev) {
            Migrations.verifyIdentity(connection, "rm_" + stage, role);
            return;
        }
        // Opt-in exclusivo do ensaio isolado. Nunca habilita DDL nem hml/dev.
        if (recoveryTest && !stage.equals("test")) {
            throw new IllegalStateException("Recuperação aceita somente testes.");
        }
        int expectedPort = sharedDev ? 5432 : 55433;
        try (var statement = connection.createStatement();
             var result = statement.executeQuery("select current_database(),current_user,inet_server_port(),host(inet_server_addr())")) {
            if (!result.next() || !("rm_" + stage).equals(result.getString(1)) || !role.equals(result.getString(2))
                    || result.getInt(3) != expectedPort || !"127.0.0.1".equals(result.getString(4))) {
                throw new IllegalStateException("Conexão efetiva recusada.");
            }
        }
    }
}
