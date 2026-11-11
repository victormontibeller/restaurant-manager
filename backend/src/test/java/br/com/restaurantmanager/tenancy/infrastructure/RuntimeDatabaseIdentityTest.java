package br.com.restaurantmanager.tenancy.infrastructure;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import org.junit.jupiter.api.Test;

class RuntimeDatabaseIdentityTest {
    private static final String SHARED_DEV_URL = "jdbc:postgresql://127.0.0.1:5432/rm_dev";

    private void verify(Connection connection, String stage, String role, boolean recoveryTest) throws Exception {
        int port = recoveryTest ? 55433 : 55432;
        RuntimeDatabaseIdentity.verify(connection, stage, role, recoveryTest,
                "jdbc:postgresql://127.0.0.1:" + port + "/rm_" + stage);
    }

    private Connection connection(String database, String role, int port, String host) throws Exception {
        var connection = mock(Connection.class);
        var statement = mock(Statement.class);
        var result = mock(ResultSet.class);
        when(connection.createStatement()).thenReturn(statement);
        when(statement.executeQuery("select current_database(),current_user,inet_server_port(),host(inet_server_addr())")).thenReturn(result);
        when(result.next()).thenReturn(true);
        when(result.getString(1)).thenReturn(database);
        when(result.getString(2)).thenReturn(role);
        when(result.getInt(3)).thenReturn(port);
        when(result.getString(4)).thenReturn(host);
        return connection;
    }

    @Test void recuperacaoExigeOptInEAlvoDeTesteExato() throws Exception {
        var restored = connection("rm_test", "rm_test_app", 55433, "127.0.0.1");
        verify(restored, "test", "rm_test_app", true);
        assertThatThrownBy(() -> verify(restored, "test", "rm_test_app", false))
                .isInstanceOf(IllegalStateException.class);
        for (String stage : new String[]{"dev", "hml", "prod"}) {
            assertThatThrownBy(() -> verify(restored, stage, "rm_" + stage + "_app", true))
                    .isInstanceOf(IllegalStateException.class);
        }
        for (Connection wrong : new Connection[]{
                connection("rm_hml", "rm_test_app", 55433, "127.0.0.1"),
                connection("rm_test", "rm_test_owner", 55433, "127.0.0.1"),
                connection("rm_test", "rm_test_app", 55432, "127.0.0.1"),
                connection("rm_test", "rm_test_app", 55434, "127.0.0.1"),
                connection("rm_test", "rm_test_app", 55433, "0.0.0.0")}) {
            assertThatThrownBy(() -> verify(wrong, "test", "rm_test_app", true))
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    @Test void runtimeNormalPreservaAllowlistEIdentidade() throws Exception {
        for (String stage : new String[]{"dev", "test", "hml"}) {
            verify(connection("rm_" + stage, "rm_" + stage + "_app", 55432, "127.0.0.1"),
                    stage, "rm_" + stage + "_app", false);
        }
        assertThatThrownBy(() -> verify(connection("rm_test", "rm_test_app", 55433, "127.0.0.1"),
                "test", "rm_test_app", false)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> verify(connection("rm_prod", "rm_prod_app", 55432, "127.0.0.1"),
                "prod", "rm_prod_app", false)).isInstanceOf(IllegalStateException.class);
    }

    @Test void postgresCompartilhadoAceitaSomenteRuntimeDevLocalNoBancoDoProjeto() throws Exception {
        var dev = connection("rm_dev", "rm_dev_app", 5432, "127.0.0.1");
        RuntimeDatabaseIdentity.verify(dev, "dev", "rm_dev_app", false, SHARED_DEV_URL);
        assertThatThrownBy(() -> verify(dev, "dev", "rm_dev_app", false))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> Migrations.verifyIdentity(dev, "rm_dev", "rm_dev_app"))
                .isInstanceOf(IllegalStateException.class);
        for (String stage : new String[]{"test", "hml"}) {
            var role = "rm_" + stage + "_app";
            var other = connection("rm_" + stage, role, 5432, "127.0.0.1");
            assertThatThrownBy(() -> RuntimeDatabaseIdentity.verify(other, stage, role, false, SHARED_DEV_URL))
                    .isInstanceOf(IllegalStateException.class);
        }
        for (var wrong : new Connection[]{
                connection("loja_3d_dev", "rm_dev_app", 5432, "127.0.0.1"),
                connection("rm_dev", "rm_dev_owner", 5432, "127.0.0.1"),
                connection("rm_dev", "rm_dev_app", 55432, "127.0.0.1"),
                connection("rm_dev", "rm_dev_app", 5432, "192.168.15.7")}) {
            assertThatThrownBy(() -> RuntimeDatabaseIdentity.verify(wrong, "dev", "rm_dev_app", false, SHARED_DEV_URL))
                    .isInstanceOf(IllegalStateException.class);
        }
    }
}
