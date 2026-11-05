package br.com.restaurantmanager;

import br.com.restaurantmanager.tenancy.TenantConnections;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PoolIsolationTest {
    @BeforeAll static void prepare() throws Exception { TestDatabase.prepare(); }
    private HikariDataSource pool(int size) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(System.getenv("RM_DB_URL"));
        config.setUsername(System.getenv("RM_DB_USER"));
        config.setPassword(System.getenv("RM_DB_PASSWORD"));
        config.setMaximumPoolSize(size);
        config.setSchema("pg_catalog");
        config.addDataSourceProperty("cancelSignalTimeout","2");
        return new HikariDataSource(config);
    }
    @Test void rollbackSqlEReutilizacaoDaMesmaConexao() throws Exception {
        try (var pool = pool(1)) {
            var provider = new TenantConnections(pool);
            var a = provider.getConnection(FundacaoTest.A);
            int pid;
            try (var s = a.createStatement(); var r = s.executeQuery("select pg_backend_pid()")) { r.next(); pid = r.getInt(1); }
            a.setAutoCommit(false);
            assertThatThrownBy(() -> a.createStatement().execute("select 1/0")).isInstanceOf(java.sql.SQLException.class);
            a.rollback(); a.setAutoCommit(true);
            provider.releaseConnection(FundacaoTest.A,a);
            try (var neutral = pool.getConnection(); var s = neutral.createStatement(); var r = s.executeQuery("select pg_backend_pid(), current_schema()")) {
                r.next(); assertThat(r.getInt(1)).isEqualTo(pid); assertThat(r.getString(2)).isEqualTo("pg_catalog");
            }
            var b = provider.getConnection(FundacaoTest.B);
            try (var s = b.createStatement(); var r = s.executeQuery("select nome from unidade")) { r.next(); assertThat(r.getString(1)).isEqualTo("B1"); }
            finally { provider.releaseConnection(FundacaoTest.B,b); }
        }
    }
    @Test void cancelamentoSqlLimpaContextoAntesDeReusarConexaoEThread() throws Exception {
        try (var pool = pool(1); var thread = Executors.newSingleThreadExecutor()) {
            var provider = new TenantConnections(pool);
            var cancelled = thread.submit(() -> {
                try (var scope = br.com.restaurantmanager.tenancy.TenantScope.open(FundacaoTest.A)) {
                    var c = provider.getConnection(FundacaoTest.A);
                    try {
                        c.setNetworkTimeout(Runnable::run,5000);
                        int pid;
                        try (var s = c.createStatement(); var rows = s.executeQuery("select pg_backend_pid()")) { rows.next(); pid = rows.getInt(1); }
                        c.setAutoCommit(false);
                        try (var s = c.createStatement()) {
                            // O driver envia cancelamento real, não uma exceção simulada.
                            s.setQueryTimeout(1);
                            assertThatThrownBy(() -> s.execute("select pg_sleep(30)"))
                                    .isInstanceOfSatisfying(java.sql.SQLException.class, failure -> assertThat(failure.getSQLState()).isEqualTo("57014"));
                        }
                        return new long[]{pid, Thread.currentThread().threadId()};
                    } finally {
                        try { c.rollback(); c.setAutoCommit(true); }
                        finally { provider.releaseConnection(FundacaoTest.A,c); }
                    }
                }
            }).get(15,TimeUnit.SECONDS);
            thread.submit(() -> {
                assertThat(Thread.currentThread().threadId()).isEqualTo(cancelled[1]);
                assertThat(br.com.restaurantmanager.tenancy.TenantScope.current()).isEqualTo("__none__");
                try (var c = pool.getConnection(); var s = c.createStatement(); var rows = s.executeQuery("select pg_backend_pid(),current_schema()")) {
                    rows.next(); assertThat(rows.getLong(1)).isEqualTo(cancelled[0]); assertThat(rows.getString(2)).isEqualTo("pg_catalog");
                }
                try (var scope = br.com.restaurantmanager.tenancy.TenantScope.open(FundacaoTest.B)) {
                    var c = provider.getConnection(FundacaoTest.B);
                    try (var s = c.createStatement(); var rows = s.executeQuery("select pg_backend_pid(),nome from unidade order by nome")) {
                        assertThat(rows.next()).isTrue();assertThat(rows.getLong(1)).isEqualTo(cancelled[0]);assertThat(rows.getString(2)).isEqualTo("B1");
                        assertThat(rows.next()).isFalse();
                    } finally { provider.releaseConnection(FundacaoTest.B,c); }
                }
                assertThat(br.com.restaurantmanager.tenancy.TenantScope.current()).isEqualTo("__none__");
                return null;
            }).get(15,TimeUnit.SECONDS);
        }
    }
    @Test void transacoesSimultaneasNaoMisturamEmpresas() throws Exception {
        try (var pool = pool(2); var threads = Executors.newFixedThreadPool(2)) {
            var provider = new TenantConnections(pool);
            var barrier = new CyclicBarrier(2);
            var a = threads.submit(() -> read(provider, FundacaoTest.A, barrier));
            var b = threads.submit(() -> read(provider, FundacaoTest.B, barrier));
            assertThat(a.get(15,TimeUnit.SECONDS)).isEqualTo("A1");
            assertThat(b.get(15,TimeUnit.SECONDS)).isEqualTo("B1");
        }
    }
    private String read(TenantConnections provider, String schema, CyclicBarrier barrier) throws Exception {
        var c = provider.getConnection(schema);
        try {
            c.setAutoCommit(false);
            barrier.await(10,TimeUnit.SECONDS);
            try (var s = c.createStatement(); var r = s.executeQuery("select nome from unidade order by nome")) {
                r.next(); String name = r.getString(1); c.commit(); return name;
            }
        } finally { c.rollback(); c.setAutoCommit(true); provider.releaseConnection(schema,c); }
    }
}
