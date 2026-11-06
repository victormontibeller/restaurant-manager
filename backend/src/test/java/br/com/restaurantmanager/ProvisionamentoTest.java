package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.plataforma.commands.ProvisionamentoCommand;
import br.com.restaurantmanager.plataforma.dtos.PedidoProvisionamento;
import br.com.restaurantmanager.plataforma.services.ProvisionamentoService;
import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import br.com.restaurantmanager.tenancy.infrastructure.SchemaCompatibility;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class ProvisionamentoTest {
    private final List<UUID> created = new ArrayList<>();
    private ProvisionamentoService service;

    @BeforeEach void prepare() throws Exception {
        TestDatabase.prepare();
        service = new ProvisionamentoService(System.getenv());
    }

    private PedidoProvisionamento pedido(String host) {
        UUID id = UUID.randomUUID();
        created.add(id);
        return new PedidoProvisionamento(id, "Empresa fictícia", host, "Unidade inicial", "admin@example.invalid",
                UUID.randomUUID() + "-Senha9!");
    }

    private Connection owner() throws Exception {
        var c = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
        Migrations.verifyIdentity(c, "rm_test", "rm_test_owner");
        return c;
    }

    @AfterEach void cleanup() throws Exception {
        // Exclusivamente objetos desta execução após verificar identidade efetiva.
        try (var c = owner(); var s = c.createStatement()) {
            for (UUID id : created) {
                String schema = "t_" + id.toString().replace("-", "");
                s.execute("delete from public.auditoria_provisionamento where empresa_id='" + id + "'");
                s.execute("delete from public.provisionamento where empresa_id='" + id + "'");
                s.execute("delete from public.dominio where empresa_id='" + id + "'");
                s.execute("delete from public.empresa where id='" + id + "'");
                s.execute("drop schema if exists " + schema + " cascade");
            }
        }
    }

    @Test void criaAdministradorUnidadeDominioESchemaSemDuplicar() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        var result = service.provisionar(command);
        assertThat(service.provisionar(command)).isEqualTo(result);
        assertThat(result.estado()).isEqualTo("ATIVO");
        try (var c = owner(); var s = c.createStatement()) {
            var r = s.executeQuery("select email,senha_hash,perfil,ativo from " + result.schema() + ".usuario");
            assertThat(r.next()).isTrue();
            assertThat(r.getString(1)).isEqualTo(command.email());
            assertThat(r.getString(2)).isNotEqualTo(command.senha());
            assertThat(new BCryptPasswordEncoder().matches(command.senha(), r.getString(2))).isTrue();
            assertThat(r.getString(3)).isEqualTo("ADMINISTRADOR");
            assertThat(r.getBoolean(4)).isTrue();
            assertThat(r.next()).isFalse();
            r = s.executeQuery("select count(*) from " + result.schema() + ".unidade");
            r.next(); assertThat(r.getInt(1)).isEqualTo(1);
        }
        assertThat(command.toString()).doesNotContain(command.senha());
    }

    @Test void reservaInterrompidaRetomaEmOutraInstanciaSemAtivarParcial() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        service.reservar(command);
        try (var c = owner(); var s = c.createStatement()) {
            var r = s.executeQuery("select estado from public.empresa where id='" + command.id() + "'");
            r.next(); assertThat(r.getString(1)).isEqualTo("PROVISIONANDO");
            r = s.executeQuery("select count(*) from public.dominio d join public.empresa e on e.id=d.empresa_id where e.estado='ATIVO' and d.host='" + command.host() + "'");
            r.next(); assertThat(r.getInt(1)).isZero();
        }
        var resumed = new ProvisionamentoService(System.getenv()).concluir(command.id());
        assertThat(resumed.estado()).isEqualTo("ATIVO");
        assertThat(service.provisionar(command)).isEqualTo(resumed);
    }

    @Test void mesmaChaveComPayloadOuSenhaDiferenteConflita() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        service.reservar(command);
        assertThatThrownBy(() -> service.reservar(new PedidoProvisionamento(command.id(), "Outro", command.host(), command.unidade(), command.email(), command.senha())))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service.reservar(new PedidoProvisionamento(command.id(), command.nome(), command.host(), command.unidade(), command.email(), UUID.randomUUID().toString())))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test void dominioReservadoNaoPodeSerTomadoPorOutraEmpresa() throws Exception {
        var first = pedido("p-" + UUID.randomUUID() + ".localhost");
        service.reservar(first);
        assertThatThrownBy(() -> service.reservar(pedido(first.host()))).isInstanceOf(IllegalStateException.class);
    }

    @Test void dominioSaasNaoReservaEmpresaPlanoOuSchema() throws Exception {
        var command = pedido("plataforma.localhost");
        assertThatThrownBy(() -> service.reservar(command))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Domínio indisponível para empresa.");
        try (var c = owner(); var s = c.prepareStatement("select "
                + "(select count(*) from public.empresa where id=?),"
                + "(select count(*) from public.dominio where host=?),"
                + "(select count(*) from public.provisionamento where empresa_id=?),"
                + "(select count(*) from pg_namespace where nspname=?)")) {
            s.setObject(1, command.id()); s.setString(2, command.host()); s.setObject(3, command.id());
            s.setString(4, "t_" + command.id().toString().replace("-", ""));
            try (var rows = s.executeQuery()) {
                rows.next();
                for (int coluna = 1; coluna <= 4; coluna++) assertThat(rows.getLong(coluna)).isZero();
            }
        }
    }

    @Test void retomadaRecusaDominioQuePassouASerOrigemSaas() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        service.reservar(command);
        var ambiente = new HashMap<>(System.getenv());
        ambiente.put("RM_PLATFORM_HOST", command.host());
        assertThatThrownBy(() -> new ProvisionamentoService(ambiente).concluir(command.id()))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Domínio indisponível para empresa.");
        try (var c = owner(); var s = c.prepareStatement("select estado,"
                + "exists(select 1 from pg_namespace where nspname=schema_name) from public.empresa where id=?")) {
            s.setObject(1, command.id());
            try (var rows = s.executeQuery()) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString(1)).isEqualTo("PROVISIONANDO");
                assertThat(rows.getBoolean(2)).isFalse();
            }
        }
    }

    @Test void entradasMalformadasNaoReservamSchema() {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        for (String host : List.of("A.localhost", "a.localhost:8088", "a.localhost/rota", "a;drop.localhost", "a.example.com")) {
            assertThatThrownBy(() -> service.reservar(new PedidoProvisionamento(command.id(), command.nome(), host, command.unidade(), command.email(), command.senha())))
                    .isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test void processoCliReservaEProcessoNovoRetomaSemSenhaEmSaida() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        service.reservar(command);
        var output = Files.createTempFile(Path.of(System.getenv("TMPDIR")), "rm-cli-", ".log");
        try {
            var process = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                    "-Xmx128m", "-XX:ActiveProcessorCount=2", "-cp", System.getProperty("java.class.path"),
                    "br.com.restaurantmanager.RestaurantManagerApplication", "--retomar-provisionamento", command.id().toString())
                    .redirectErrorStream(true).redirectOutput(output.toFile()).start();
            if (!process.waitFor(40, TimeUnit.SECONDS)) {
                process.destroyForcibly();
                throw new IllegalStateException("CLI não encerrou no prazo.");
            }
            assertThat(process.exitValue()).isZero();
            String log = Files.readString(output);
            assertThat(log).contains("Provisionamento " + command.id() + ": ATIVO").doesNotContain(command.senha());
            assertThat(service.provisionar(command).estado()).isEqualTo("ATIVO");
        } finally { Files.deleteIfExists(output); }
    }

    @Test void cliCompletoCriaSomenteEmpresaSolicitada() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        var file = Files.createTempFile(Path.of(System.getenv("TMPDIR")), "rm-request-", ".properties");
        try {
            Files.writeString(file, "id=" + command.id() + "\nnome=" + command.nome() + "\nhost=" + command.host()
                    + "\nunidade=" + command.unidade() + "\nemail=" + command.email() + "\nsenha=" + command.senha() + "\n");
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
            ProvisionamentoCommand.executar(new String[]{"--provisionar", file.toString()}, System.getenv());
            assertThat(service.provisionar(command).estado()).isEqualTo("ATIVO");
        } finally { Files.deleteIfExists(file); }
    }

    @Test void homologacaoRecusadaAntesDeConectar() {
        var env = new HashMap<>(System.getenv());
        env.put("RM_STAGE", "hml");
        env.put("RM_DB_URL", "jdbc:postgresql://127.0.0.1:55432/rm_hml");
        env.put("RM_MIGRATION_USER", "rm_hml_owner");
        env.put("RM_DB_USER", "rm_hml_app");
        assertThatThrownBy(() -> new ProvisionamentoService(env).concluir(UUID.randomUUID()))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Destino de provisionamento recusado.");
    }

    @Test void pedidoCliInvalidoNaoMigraEmpresasReservadas() throws Exception {
        var pending = pedido("p-" + UUID.randomUUID() + ".localhost");
        service.reservar(pending);
        var file = Files.createTempFile(Path.of(System.getenv("TMPDIR")), "rm-invalid-", ".properties");
        try {
            Files.writeString(file, "id=" + UUID.randomUUID() + "\nnome=Fictícia\nhost=INVALIDO\nunidade=Inicial\nemail=admin@example.invalid\nsenha=" + UUID.randomUUID() + "\n");
            Files.setPosixFilePermissions(file, PosixFilePermissions.fromString("rw-------"));
            assertThatThrownBy(() -> ProvisionamentoCommand.executar(new String[]{"--provisionar", file.toString()}, System.getenv()))
                    .isInstanceOf(IllegalArgumentException.class);
            try (var c = owner(); var s = c.createStatement()) {
                var r = s.executeQuery("select count(*) from pg_namespace where nspname='t_" + pending.id().toString().replace("-", "") + "'");
                r.next(); assertThat(r.getInt(1)).isZero();
            }
        } finally { Files.deleteIfExists(file); }
    }

    @Test void mesmoEmailEmDuasEmpresasNaoCompartilhaIdentidade() throws Exception {
        var a = service.provisionar(pedido("p-" + UUID.randomUUID() + ".localhost"));
        var b = service.provisionar(pedido("p-" + UUID.randomUUID() + ".localhost"));
        assertThat(a.schema()).isNotEqualTo(b.schema());
        try (var c = owner(); var s = c.createStatement()) {
            var r = s.executeQuery("select a.id<>b.id and a.email=b.email from " + a.schema() + ".usuario a cross join " + b.schema() + ".usuario b");
            r.next(); assertThat(r.getBoolean(1)).isTrue();
        }
    }

    @Test void migracaoDeTenantExigeLockReal() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        service.reservar(command);
        try (var c = owner()) {
            assertThatThrownBy(() -> Migrations.migrateTenant(c, System.getenv(), "t_" + command.id().toString().replace("-", "")))
                    .isInstanceOf(IllegalStateException.class).hasMessage("Lock de migração obrigatório.");
        }
    }

    @Test void runtimeNaoRecebePlanoOuCredencialDoProvisionador() throws Exception {
        try (var c = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_DB_USER"), System.getenv("RM_DB_PASSWORD"));
             var s = c.createStatement()) {
            Migrations.verifyIdentity(c, "rm_test", "rm_test_app");
            assertThatThrownBy(() -> s.executeQuery("select * from public.provisionamento"))
                    .isInstanceOf(SQLException.class);
        }
    }

    @Test void falhaDeAtivacaoNaoDeixaUnidadeOuAdministradorParcialERetoma() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        service.reservar(command);
        Migrations.run(System.getenv());
        String schema = "t_" + command.id().toString().replace("-", "");
        try (var c = owner(); var s = c.createStatement()) {
            s.execute("create function " + schema + ".falha_ensaio() returns trigger language plpgsql as $$ begin raise exception 'falha controlada'; end $$");
            s.execute("create trigger falha before insert on " + schema + ".usuario for each row execute function " + schema + ".falha_ensaio()");
        }
        assertThatThrownBy(() -> service.concluir(command.id())).isInstanceOf(IllegalStateException.class);
        try (var c = owner(); var s = c.createStatement()) {
            var r = s.executeQuery("select estado from public.empresa where id='" + command.id() + "'");
            r.next(); assertThat(r.getString(1)).isEqualTo("FALHOU");
            r = s.executeQuery("select count(*) from " + schema + ".unidade");
            r.next(); assertThat(r.getInt(1)).isZero();
            s.execute("drop trigger falha on " + schema + ".usuario");
        }
        assertThat(new ProvisionamentoService(System.getenv()).concluir(command.id()).estado()).isEqualTo("ATIVO");
    }

    @Test void empresaReservadaNaoImpedeRuntimeDasAtivas() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        service.reservar(command); // Schema propositalmente ainda ausente.
        var config = new HikariConfig();
        config.setJdbcUrl(System.getenv("RM_DB_URL"));
        config.setUsername(System.getenv("RM_DB_USER"));
        config.setPassword(System.getenv("RM_DB_PASSWORD"));
        config.setMaximumPoolSize(2);
        config.setSchema("pg_catalog");
        try (var pool = new HikariDataSource(config)) {
            new SchemaCompatibility(pool, "rm_test_app", "test", false).afterPropertiesSet();
        }
    }

    @Test void duasTentativasSimultaneasTerminamComUmaEmpresa() throws Exception {
        var command = pedido("p-" + UUID.randomUUID() + ".localhost");
        var barrier = new CountDownLatch(2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var tasks = new ArrayList<Future<String>>();
            for (int i = 0; i < 2; i++) tasks.add(executor.submit(() -> {
                barrier.countDown();
                if (!barrier.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Barreira expirada.");
                try { return service.provisionar(command).estado(); }
                catch (IllegalStateException conflict) {
                    assertThat(conflict).hasMessage("Outro migrador ou provisionador está ativo.");
                    return "CONFLITO";
                }
            }));
            var results = List.of(tasks.get(0).get(30, TimeUnit.SECONDS), tasks.get(1).get(30, TimeUnit.SECONDS));
            assertThat(results).contains("ATIVO");
            assertThat(results).allMatch(state -> state.equals("ATIVO") || state.equals("CONFLITO"));
        }
        assertThat(service.provisionar(command).estado()).isEqualTo("ATIVO");
    }
}
