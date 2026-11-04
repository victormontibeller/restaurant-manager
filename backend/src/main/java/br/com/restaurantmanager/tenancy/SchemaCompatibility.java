package br.com.restaurantmanager.tenancy;

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

    public SchemaCompatibility(DataSource dataSource, @Value("${spring.datasource.username}") String runtimeRole,
                               @Value("${rm.stage}") String stage) {
        this.dataSource = dataSource;
        this.runtimeRole = runtimeRole;
        this.stage = stage;
    }

    @Override public void afterPropertiesSet() throws SQLException {
        var schemas = new ArrayList<String>();
        schemas.add("public");
        try (var connection = dataSource.getConnection()) {
            if (!java.util.List.of("dev", "test", "hml").contains(stage)
                    || !runtimeRole.equals("rm_" + stage + "_app")) {
                throw new IllegalStateException("Identidade de runtime recusada.");
            }
            Migrations.verifyIdentity(connection, "rm_" + stage, runtimeRole);
            schemas.addAll(Migrations.tenantSchemas(connection));
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
