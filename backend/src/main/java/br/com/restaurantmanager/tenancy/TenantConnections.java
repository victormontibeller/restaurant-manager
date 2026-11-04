package br.com.restaurantmanager.tenancy;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Map;
import javax.sql.DataSource;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.hibernate.engine.jdbc.connections.spi.MultiTenantConnectionProvider;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;

@Component
public class TenantConnections implements MultiTenantConnectionProvider<String>, CurrentTenantIdentifierResolver<String>, HibernatePropertiesCustomizer {
    private final DataSource dataSource;
    public TenantConnections(DataSource dataSource) { this.dataSource = dataSource; }
    @Override public Connection getAnyConnection() throws SQLException { return select("t_template"); }
    @Override public void releaseAnyConnection(Connection connection) throws SQLException { release(connection); }
    @Override public Connection getConnection(String tenant) throws SQLException {
        if (tenant == null || !tenant.matches("t_[a-f0-9]{32}")) throw new SQLException("Contexto empresarial obrigatório.");
        return select(tenant);
    }
    private Connection select(String schema) throws SQLException {
        Connection connection = dataSource.getConnection();
        try {
            connection.setSchema(schema);
            return connection;
        } catch (SQLException failure) {
            invalidate(connection, failure);
            throw failure;
        }
    }
    @Override public void releaseConnection(String tenant, Connection connection) throws SQLException { release(connection); }
    private void release(Connection connection) throws SQLException {
        try {
            connection.setSchema("pg_catalog");
        } catch (SQLException failure) {
            invalidate(connection, failure);
            throw failure;
        }
        connection.close();
    }
    private void invalidate(Connection connection, SQLException original) {
        try { connection.abort(Runnable::run); }
        catch (SQLException failure) { original.addSuppressed(failure); }
        finally {
            try { connection.close(); }
            catch (SQLException failure) { original.addSuppressed(failure); }
        }
    }
    @Override public String resolveCurrentTenantIdentifier() { return TenantScope.current(); }
    @Override public boolean validateExistingCurrentSessions() { return true; }
    @Override public boolean supportsAggressiveRelease() { return false; }
    @Override public boolean isUnwrappableAs(Class<?> type) { return type.isInstance(this); }
    @Override public <T> T unwrap(Class<T> type) { return type.cast(this); }
    @Override public void customize(Map<String, Object> properties) {
        properties.put("hibernate.multi_tenant_connection_provider", this);
        properties.put("hibernate.tenant_identifier_resolver", this);
    }
}
