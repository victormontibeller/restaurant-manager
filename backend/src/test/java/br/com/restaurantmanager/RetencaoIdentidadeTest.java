package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.identidade.dtos.ResultadoRetencao;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.services.IdentidadeService;
import br.com.restaurantmanager.identidade.services.RetencaoIdentidadeService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class RetencaoIdentidadeTest {
    // O banco persiste entre execuções: não contar/expurgar massa de outras suítes.
    private static final String A = "t_" + UUID.randomUUID().toString().replace("-", "");
    private static final String B = "t_" + UUID.randomUUID().toString().replace("-", "");
    @Autowired RetencaoIdentidadeService retencao;
    @Autowired IdentidadeService identidade;
    private UUID usuario;
    private final List<String> chaves = new ArrayList<>();
    @BeforeAll static void preparar() throws Exception {
        TestDatabase.prepare();
        TestDatabase.migrate(A, "tenant");
        TestDatabase.migrate(B, "tenant");
    }
    private Connection owner() throws Exception {
        var c = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
        try { Migrations.verifyIdentity(c, "rm_test", "rm_test_owner"); return c; }
        catch (Exception failure) { c.close(); throw failure; }
    }
    @BeforeEach void conta() throws Exception {
        usuario = UUID.randomUUID();
        try (var c = owner()) {
            for (String schema : List.of(A, B)) {
                try (var s = c.prepareStatement("insert into " + schema + ".usuario(id,email,senha_hash,perfil,email_verificado) values (?,?,?,'CLIENTE',true)")) {
                    s.setObject(1, usuario); s.setString(2, usuario + "@example.invalid");
                    // Esta conta é usada somente em sessões preparadas, sem login por senha.
                    s.setString(3, "credencial-inutilizavel"); s.executeUpdate();
                }
            }
        }
    }
    private UUID sessao(String schema, long expiraEmSegundos, boolean revogada) throws Exception {
        UUID id = UUID.randomUUID();
        try (var c = owner(); var s = c.prepareStatement("insert into " + schema + ".sessao(id,usuario_id,criada_em,expira_em,autenticada_em,revogada_em) values (?,?,?::timestamptz,?::timestamptz,?::timestamptz,?::timestamptz)")) {
            Instant expira = Instant.now().plusSeconds(expiraEmSegundos);
            s.setObject(1, id); s.setObject(2, usuario); s.setString(3, expira.minusSeconds(43200).toString());
            s.setString(4, expira.toString()); s.setString(5, expira.minusSeconds(43200).toString());
            s.setString(6, revogada ? Instant.now().minusSeconds(60).toString() : null); s.executeUpdate();
        }
        return id;
    }
    private String refresh(String schema, UUID sessao, boolean usado) throws Exception {
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(UUID.randomUUID().toString().substring(0, 32).getBytes(StandardCharsets.UTF_8));
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
        try (var c = owner(); var s = c.prepareStatement("insert into " + schema + ".refresh_token(hash,sessao_id,usado_em) values (?,?,?::timestamptz)")) {
            s.setString(1, hash); s.setObject(2, sessao); s.setString(3, usado ? Instant.now().minusSeconds(60).toString() : null); s.executeUpdate();
        }
        return raw;
    }
    private String limite(long segundos) throws Exception {
        String chave = UUID.randomUUID().toString(); chaves.add(chave);
        try (var c = owner(); var s = c.prepareStatement("insert into " + A + ".limite_login(chave,tentativas,inicio_em) values (?,5,?::timestamptz)")) {
            s.setString(1, chave); s.setString(2, Instant.now().plusSeconds(segundos).toString()); s.executeUpdate();
        }
        return chave;
    }
    private boolean existe(String schema, String tabela, String campo, Object id) throws Exception {
        try (var c = owner(); var s = c.prepareStatement("select count(*) from " + schema + "." + tabela + " where " + campo + "=?")) {
            s.setObject(1, id); try (var r = s.executeQuery()) { r.next(); return r.getInt(1) > 0; }
        }
    }
    private ResultadoRetencao executar(String schema) {
        try (var scope = TenantScope.open(schema)) { return retencao.executarLote(); }
    }
    @Test void eliminaSomenteExpiradosAntigosDoTenantSemPerderDeteccaoDeReuso() throws Exception {
        UUID antiga = sessao(A, -172800, false); refresh(A, antiga, false);
        UUID recente = sessao(A, -60, false); refresh(A, recente, false);
        UUID ativa = sessao(A, 3600, false);
        String usado = refresh(A, ativa, true); String atual = refresh(A, ativa, false);
        UUID revogada = sessao(A, 3600, true);
        UUID outra = sessao(B, -172800, false); refresh(B, outra, false);
        String velho = limite(-172800), bloqueio = limite(-60);
        executar(A);
        assertThat(existe(A, "sessao", "id", antiga)).isFalse();
        assertThat(existe(A, "refresh_token", "sessao_id", antiga)).isFalse();
        for (UUID id : List.of(recente, ativa, revogada)) assertThat(existe(A, "sessao", "id", id)).isTrue();
        assertThat(existe(B, "sessao", "id", outra)).isTrue();
        assertThat(existe(A, "limite_login", "chave", velho)).isFalse();
        assertThat(existe(A, "limite_login", "chave", bloqueio)).isTrue();
        try (var scope = TenantScope.open(A)) {
            assertThatThrownBy(() -> identidade.refresh(usado)).isInstanceOf(AuthFailure.class);
            assertThatThrownBy(() -> identidade.refresh(atual)).isInstanceOf(AuthFailure.class);
        }
        assertThat(TenantScope.current()).isEqualTo("__none__");
    }
    @Test void loteTemLimiteEReexecucaoConcluiSemDuplicacao() throws Exception {
        var ids = new ArrayList<UUID>();
        for (int i = 0; i < 105; i++) ids.add(sessao(A, -172800, false));
        var primeiro = executar(A);
        assertThat(primeiro.sessoes()).isEqualTo(100);
        int restantes = 0;
        for (UUID id : ids) if (existe(A, "sessao", "id", id)) restantes++;
        assertThat(restantes).isEqualTo(5);
        assertThat(executar(A).sessoes()).isEqualTo(5);
        assertThat(executar(A).sessoes()).isZero();
    }
    @Test void trabalhadoresConcorrentesNaoDuplicamEfeitos() throws Exception {
        for (int i = 0; i < 20; i++) sessao(A, -172800, false);
        var inicio = new CyclicBarrier(2);
        try (var threads = Executors.newFixedThreadPool(2)) {
            Callable<Integer> tarefa = () -> {
                inicio.await(10, TimeUnit.SECONDS); return executar(A).sessoes();
            };
            var a = threads.submit(tarefa); var b = threads.submit(tarefa);
            assertThat(a.get(20, TimeUnit.SECONDS) + b.get(20, TimeUnit.SECONDS)).isEqualTo(20);
        }
        assertThat(executar(A).sessoes()).isZero();
    }
    @Test void sessaoBloqueadaNaoInterrompeLoteEExpurgoRetomaDepois() throws Exception {
        UUID id = sessao(A, -172800, false);
        try (var c = owner()) {
            c.setAutoCommit(false);
            try (var s = c.prepareStatement("select id from " + A + ".sessao where id=? for update")) {
                s.setObject(1, id); s.executeQuery().close();
            }
            try (var thread = Executors.newSingleThreadExecutor()) {
                var task = thread.submit(() -> executar(A));
                assertThat(task.get(10, TimeUnit.SECONDS).sessoes()).isZero();
                assertThat(existe(A, "sessao", "id", id)).isTrue();
            } finally { c.rollback(); }
        }
        assertThat(executar(A).sessoes()).isEqualTo(1);
        assertThat(existe(A, "sessao", "id", id)).isFalse();
    }
    @Test void semContextoFalhaFechado() {
        assertThatThrownBy(() -> retencao.executarLote()).isInstanceOf(RuntimeException.class);
        assertThat(TenantScope.current()).isEqualTo("__none__");
    }
    @Test void oauthNaoBloqueiaExpurgoNemRemoveConexaoAuditoriaOuSessaoValida() throws Exception {
        UUID antigaConcluida = sessao(A, -172800, false);
        UUID antigaAbandonada = sessao(A, -172800, false);
        UUID valida = sessao(A, 3600, false);
        UUID outroTenant = sessao(B, -172800, false);
        for (UUID id : List.of(antigaConcluida, antigaAbandonada, valida)) refresh(A, id, false);
        UUID oauthConcluido = oauth(A, antigaConcluida, "CONCLUIDO", -172800);
        UUID oauthAbandonado = oauth(A, antigaAbandonada, "CRIADO", -172800);
        UUID oauthValido = oauth(A, valida, "CRIADO", 300);
        UUID oauthOutro = oauth(B, outroTenant, "CONCLUIDO", -172800);
        String limiteAntigo = limite(-172800);
        String limiteVigente = limite(-60);
        UUID conexao = UUID.randomUUID();
        UUID auditoria = UUID.randomUUID();
        try (var c = owner()) {
            try (var s = c.prepareStatement("insert into " + A + ".mp_conexao(id,vendedor,credencial,expira_em) values (?,?,?,now()+interval '1 hour')")) {
                s.setObject(1, conexao); s.setString(2, conexao.toString());
                s.setString(3, "cifra-ficticia-preservada"); s.executeUpdate();
            }
            try (var s = c.prepareStatement("insert into " + A + ".auditoria_acesso(id,ator_id,recurso_id,evento,antes,depois,ocorrido_em) values (?,?,?,'MERCADOPAGO_CONECTADO','','',now())")) {
                s.setObject(1, auditoria); s.setObject(2, usuario); s.setObject(3, conexao); s.executeUpdate();
            }
        }
        try {
            assertThat(executar(A).sessoes()).isEqualTo(2);
            for (UUID id : List.of(antigaConcluida, antigaAbandonada)) {
                assertThat(existe(A, "sessao", "id", id)).isFalse();
                assertThat(existe(A, "refresh_token", "sessao_id", id)).isFalse();
            }
            assertThat(existe(A, "mp_oauth", "id", oauthConcluido)).isFalse();
            assertThat(existe(A, "mp_oauth", "id", oauthAbandonado)).isFalse();
            assertThat(existe(A, "mp_oauth", "id", oauthValido)).isTrue();
            assertThat(existe(A, "sessao", "id", valida)).isTrue();
            assertThat(existe(A, "refresh_token", "sessao_id", valida)).isTrue();
            assertThat(existe(B, "mp_oauth", "id", oauthOutro)).isTrue();
            assertThat(existe(A, "mp_conexao", "id", conexao)).isTrue();
            assertThat(existe(A, "auditoria_acesso", "id", auditoria)).isTrue();
            assertThat(existe(A, "limite_login", "chave", limiteAntigo)).isFalse();
            assertThat(existe(A, "limite_login", "chave", limiteVigente)).isTrue();
            assertThat(executar(A).sessoes()).isZero();
        } finally {
            try (var c = owner()) {
                for (String tabela : List.of("mp_conexao", "auditoria_acesso")) {
                    try (var s = c.prepareStatement("delete from " + A + "." + tabela + " where id=?")) {
                        s.setObject(1, tabela.equals("mp_conexao") ? conexao : auditoria); s.executeUpdate();
                    }
                }
            }
        }
    }

    private UUID oauth(String schema, UUID sessao, String estado, long expiraEmSegundos) throws Exception {
        UUID id = UUID.randomUUID();
        try (var c = owner(); var s = c.prepareStatement("insert into " + schema + ".mp_oauth(id,state_hash,verificador,redirect_uri,ator_id,sessao_id,expira_em,estado) values (?,?,?,'https://a.localhost/retorno',?,?,?::timestamptz,?)")) {
            s.setObject(1, id); s.setString(2, id.toString().replace("-", ""));
            s.setString(3, "verificador-ficticio"); s.setObject(4, usuario); s.setObject(5, sessao);
            s.setString(6, Instant.now().plusSeconds(expiraEmSegundos).toString()); s.setString(7, estado);
            s.executeUpdate();
        }
        return id;
    }
    @Test void renovacaoConcorrenteDoLimitadorNaoPerdeBloqueio() throws Exception {
        String chave = limite(-172800);
        try (var c = owner()) {
            c.setAutoCommit(false);
            try (var s = c.prepareStatement("update " + A + ".limite_login set inicio_em=now(),tentativas=5 where chave=?")) {
                s.setString(1, chave); s.executeUpdate();
            }
            try (var thread = Executors.newSingleThreadExecutor()) {
                thread.submit(() -> executar(A)).get(10, TimeUnit.SECONDS);
            } finally { c.commit(); }
        }
        executar(A);
        assertThat(existe(A, "limite_login", "chave", chave)).isTrue();
    }
    @AfterEach void limparSomenteMassaPropria() throws Exception {
        try (var c = owner()) {
            for (String schema : List.of(A, B)) {
                for (String sql : List.of("delete from " + schema + ".refresh_token where sessao_id in (select id from " + schema + ".sessao where usuario_id=?)", "delete from " + schema + ".sessao where usuario_id=?", "delete from " + schema + ".usuario where id=?")) {
                    try (var s = c.prepareStatement(sql)) { s.setObject(1, usuario); s.executeUpdate(); }
                }
            }
            for (String chave : chaves) {
                try (var s = c.prepareStatement("delete from " + A + ".limite_login where chave=?")) { s.setString(1, chave); s.executeUpdate(); }
            }
        }
    }
}
