package br.com.restaurantmanager.tenancy;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;
import org.junit.jupiter.api.Test;

class RuntimeDatabaseIdentityTest {
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
        RuntimeDatabaseIdentity.verify(restored, "test", "rm_test_app", true);
        assertThatThrownBy(() -> RuntimeDatabaseIdentity.verify(restored, "test", "rm_test_app", false))
                .isInstanceOf(IllegalStateException.class);
        for (String stage : new String[]{"dev", "hml", "prod"}) {
            assertThatThrownBy(() -> RuntimeDatabaseIdentity.verify(restored, stage, "rm_" + stage + "_app", true))
                    .isInstanceOf(IllegalStateException.class);
        }
        for (Connection wrong : new Connection[]{
                connection("rm_hml", "rm_test_app", 55433, "127.0.0.1"),
                connection("rm_test", "rm_test_owner", 55433, "127.0.0.1"),
                connection("rm_test", "rm_test_app", 55432, "127.0.0.1"),
                connection("rm_test", "rm_test_app", 55434, "127.0.0.1"),
                connection("rm_test", "rm_test_app", 55433, "0.0.0.0")}) {
            assertThatThrownBy(() -> RuntimeDatabaseIdentity.verify(wrong, "test", "rm_test_app", true))
                    .isInstanceOf(IllegalStateException.class);
        }
    }

    @Test void runtimeNormalPreservaAllowlistEIdentidade() throws Exception {
        for (String stage : new String[]{"dev", "test", "hml"}) {
            RuntimeDatabaseIdentity.verify(connection("rm_" + stage, "rm_" + stage + "_app", 55432, "127.0.0.1"),
                    stage, "rm_" + stage + "_app", false);
        }
        assertThatThrownBy(() -> RuntimeDatabaseIdentity.verify(connection("rm_test", "rm_test_app", 55433, "127.0.0.1"),
                "test", "rm_test_app", false)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> RuntimeDatabaseIdentity.verify(connection("rm_prod", "rm_prod_app", 55432, "127.0.0.1"),
                "prod", "rm_prod_app", false)).isInstanceOf(IllegalStateException.class);
    }
}
