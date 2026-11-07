package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import br.com.restaurantmanager.tenancy.infrastructure.SchemaCompatibility;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;

class MigrationBoundaryTest {
    @Test void migradorRecusaBancoEIdentidadeAlheiosAntesDeConectar() {
        var env = new HashMap<>(System.getenv());
        env.put("RM_DB_URL", "jdbc:postgresql://127.0.0.1:55432/outro_banco");
        assertThatThrownBy(() -> Migrations.run(env)).isInstanceOf(IllegalArgumentException.class);
        env.put("RM_DB_URL", System.getenv("RM_DB_URL"));
        env.put("RM_MIGRATION_USER", "rm_hml_owner");
        assertThatThrownBy(() -> Migrations.run(env)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test void migradorReaplicaSemDuplicarERegistraTodosOsSchemas() throws Exception {
        TestDatabase.prepare();
        var expected = new ArrayList<String>(List.of("public", "t_template"));
        try (var connection = DriverManager.getConnection(System.getenv("RM_DB_URL"),
                System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
             var statement = connection.createStatement();
             var rows = statement.executeQuery("select schema_name from public.empresa order by schema_name")) {
            while (rows.next()) expected.add(rows.getString(1));
        }
        assertThat(expected).contains(FundacaoTest.A, FundacaoTest.B);
        var first = Migrations.run(System.getenv());
        var second = Migrations.run(System.getenv());
        assertThat(first).containsExactlyElementsOf(expected);
        assertThat(second).isEqualTo(first);
    }

    @Test void segundoMigradorConcorrenteFalhaSemAplicar() throws Exception {
        TestDatabase.prepare();
        try (var connection = DriverManager.getConnection(System.getenv("RM_DB_URL"),
                System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
             var statement = connection.createStatement()) {
            statement.execute("select pg_advisory_lock(7240100)");
            assertThatThrownBy(() -> Migrations.run(System.getenv()))
                    .isInstanceOf(IllegalStateException.class).hasMessage("Outro migrador está ativo.");
        }
        assertThat(Migrations.run(System.getenv())).contains("public");
    }

    @Test void falhaSqlReverteMigrationENaoOcultaRecuperacao() throws Exception {
        TestDatabase.prepare(); // Valida servidor, porta, banco e identidade antes da mutação.
        String schema = "t_cccccccccccccccccccccccccccccccc";
        Path directory = Files.createTempDirectory(Path.of(System.getenv().getOrDefault("TMPDIR", "target")), "rm-migration-");
        Path script = directory.resolve("V1__ensaio.sql");
        try (var connection = DriverManager.getConnection(System.getenv("RM_DB_URL"),
                System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
             var statement = connection.createStatement()) {
            Migrations.verifyIdentity(connection, "rm_test", "rm_test_owner");
            statement.execute("drop schema if exists " + schema + " cascade");
            Files.writeString(script, "create table exemplo(id int primary key); select 1/0;");
            var flyway = Flyway.configure().dataSource(System.getenv("RM_DB_URL"),
                    System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"))
                    .defaultSchema(schema).schemas(schema).locations("filesystem:" + directory).cleanDisabled(true).load();
            assertThatThrownBy(flyway::migrate).isInstanceOf(FlywayException.class);
            try (var rows = statement.executeQuery("select to_regclass('" + schema + ".exemplo')")) {
                rows.next(); assertThat(rows.getString(1)).isNull();
            }
            Files.writeString(script, "create table exemplo(id int primary key); insert into exemplo values (1);");
            flyway.migrate();
            flyway.migrate();
            try (var rows = statement.executeQuery("select count(*) from " + schema + ".exemplo")) {
                rows.next(); assertThat(rows.getInt(1)).isEqualTo(1);
            }
        } finally {
            try (var connection = DriverManager.getConnection(System.getenv("RM_DB_URL"),
                    System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
                 var statement = connection.createStatement()) {
                Migrations.verifyIdentity(connection, "rm_test", "rm_test_owner");
                statement.execute("drop schema if exists " + schema + " cascade");
            }
            Files.deleteIfExists(script);
            Files.deleteIfExists(directory);
        }
    }

    @Test void runtimeRecusaChecksumDivergenteSemRepararHistorico() throws Exception {
        TestDatabase.prepare();
        var config = new HikariConfig();
        config.setJdbcUrl(System.getenv("RM_DB_URL"));
        config.setUsername(System.getenv("RM_DB_USER"));
        config.setPassword(System.getenv("RM_DB_PASSWORD"));
        // Flyway valida com conexão de metadados e de callbacks; runtime usa pool de quatro.
        config.setMaximumPoolSize(2);
        config.setSchema("pg_catalog");
        try (var runtime = new HikariDataSource(config);
             var owner = DriverManager.getConnection(System.getenv("RM_DB_URL"),
                     System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
             var statement = owner.createStatement()) {
            Migrations.verifyIdentity(owner, "rm_test", "rm_test_owner");
            int checksum;
            try (var rows = statement.executeQuery("select checksum from public.flyway_schema_history where version='1'")) {
                rows.next(); checksum = rows.getInt(1);
            }
            var validator = new SchemaCompatibility(runtime, "rm_test_app", "test", false);
            try {
                statement.executeUpdate("update public.flyway_schema_history set checksum=0 where version='1'");
                assertThatThrownBy(validator::afterPropertiesSet)
                        .isInstanceOf(FlywayException.class)
                        .hasMessageContaining("checksum mismatch");
                try (var rows = statement.executeQuery("select checksum from public.flyway_schema_history where version='1'")) {
                    rows.next(); assertThat(rows.getInt(1)).isZero();
                }
            } finally {
                try (var restore = owner.prepareStatement("update public.flyway_schema_history set checksum=? where version='1'")) {
                    restore.setInt(1, checksum); restore.executeUpdate();
                }
            }
            validator.afterPropertiesSet();
        }
    }
}
