package br.com.restaurantmanager.tenancy;

import java.sql.SQLException;
import java.util.ArrayList;
import org.flywaydb.core.Flyway;
import org.springframework.boot.flyway.autoconfigure.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class Migrations {
    @Bean
    FlywayMigrationStrategy migrateAllSchemas() {
        return publicFlyway -> {
            publicFlyway.migrate();
            var config = publicFlyway.getConfiguration();
            var schemas = new ArrayList<String>();
            schemas.add("t_template");
            try (var connection = config.getDataSource().getConnection();
                 var statement = connection.createStatement();
                 var result = statement.executeQuery("select schema_name from public.empresa order by id")) {
                while (result.next()) {
                    String schema = result.getString(1);
                    if (!schema.matches("t_[a-f0-9]{32}")) throw new IllegalStateException("Schema registrado inválido.");
                    schemas.add(schema);
                }
            } catch (SQLException failure) {
                throw new IllegalStateException("Não foi possível verificar os schemas empresariais.", failure);
            }
            for (String schema : schemas) {
                Flyway.configure().dataSource(config.getDataSource()).defaultSchema(schema).schemas(schema)
                        .locations("classpath:db/migration/tenant").placeholders(config.getPlaceholders())
                        .cleanDisabled(true).load().migrate();
            }
        };
    }
}
