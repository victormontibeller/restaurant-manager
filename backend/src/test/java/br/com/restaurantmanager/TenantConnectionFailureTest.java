package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import br.com.restaurantmanager.tenancy.infrastructure.TenantConnections;
import java.sql.Connection;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class TenantConnectionFailureTest {
    @Test void abortaConexaoQuandoNaoConsegueNeutralizar() throws Exception {
        DataSource source = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(source.getConnection()).thenReturn(connection);
        doThrow(new SQLException("falha induzida")).when(connection).setSchema("pg_catalog");
        var provider = new TenantConnections(source);
        assertThatThrownBy(() -> provider.releaseConnection("t_" + "a".repeat(32), connection))
                .isInstanceOf(SQLException.class);
        verify(connection).abort(any());
        verify(connection).close();
    }
}
