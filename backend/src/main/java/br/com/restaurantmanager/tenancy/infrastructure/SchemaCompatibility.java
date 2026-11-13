package br.com.restaurantmanager.tenancy.infrastructure;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Map;
import javax.sql.DataSource;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Valida o artefato contra o banco sem receber credenciais de DDL. */
@Component("schemaCompatibility")
public class SchemaCompatibility implements InitializingBean {
    private final DataSource dataSource;
    private final String runtimeRole;
    private final String stage;
    private final boolean recoveryTest;
    private final String databaseUrl;

    public SchemaCompatibility(DataSource dataSource, @Value("${spring.datasource.username}") String runtimeRole,
                               @Value("${rm.stage}") String stage,
                               @Value("${rm.recovery-test:false}") boolean recoveryTest,
                               @Value("${spring.datasource.url}") String databaseUrl) {
        this.dataSource = dataSource;
        this.runtimeRole = runtimeRole;
        this.stage = stage;
        this.recoveryTest = recoveryTest;
        this.databaseUrl = databaseUrl;
    }

    @Override public void afterPropertiesSet() throws SQLException {
        var schemas = new ArrayList<String>();
        schemas.add("public");
        try (var connection = dataSource.getConnection()) {
            RuntimeDatabaseIdentity.verify(connection, stage, runtimeRole, recoveryTest, databaseUrl);
            // Empresas incompletas já falham fechado na resolução; não derrubam as ativas.
            schemas.addAll(Migrations.tenantSchemas(connection, false));
        }
        for (String schema : schemas) {
            var flyway = Flyway.configure().dataSource(dataSource).defaultSchema(schema).schemas(schema)
                    .locations("classpath:db/migration/" + (schema.equals("public") ? "public" : "tenant"))
                    .placeholders(Map.of("runtimeRole", runtimeRole)).createSchemas(false)
                    .ignoreMigrationPatterns("").cleanDisabled(true).load();
            flyway.validate();
            if (flyway.info().current() == null || flyway.info().pending().length != 0) {
                throw new IllegalStateException("Migração pendente; runtime não pode iniciar.");
            }
        }
    }
}
