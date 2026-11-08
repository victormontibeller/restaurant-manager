package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class AcessosSessaoConcorrenciaTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @Test
    void logoutAguardaOperacaoJaAutorizadaQueEsperaComanda() throws Exception {
        try (var c = new MesasCenario(mvc, mapper); var bloqueador = c.base.banco();
                var executor = Executors.newFixedThreadPool(2)) {
            var comanda = c.comanda(c.abrir());
            String sessao = c.base.json(c.base.enviar("GET", "/api/v1/auth/me", c.base.token, null)).get("sessaoId").asText();
            String refresh = refreshControlado(c.base, sessao);
            bloqueador.setAutoCommit(false);
            try (var sql = bloqueador.createStatement()) {
                sql.execute("select id from " + c.base.schema + ".comanda where id='" + comanda + "' for update");
                int barreira = pid(bloqueador);
                var fechamento = executor.submit(() -> c.estado(comanda, "iniciar-fechamento", 0).getStatus());
                try {
                    int operacao = aguardarBloqueio(c.base, barreira, fechamento);
                    assertThat(operacao).as("A operação precisa alcançar o lock da comanda.").isPositive();
                    var logout = executor.submit(() -> logout(c.base, refresh));
                    int revogacao = aguardarBloqueio(c.base, operacao, logout);
                    assertThat(revogacao).as("Logout não pode confirmar enquanto a operação autorizada aguarda a comanda.").isPositive();
                    assertThat(logout.isDone()).isFalse();
                    bloqueador.commit();
                    assertThat(fechamento.get(15, TimeUnit.SECONDS)).isEqualTo(200);
                    assertThat(logout.get(15, TimeUnit.SECONDS)).isEqualTo(204);
                    assertThat(c.estado(comanda, "reabrir", 1).getStatus()).isEqualTo(401);
                } finally {
                    bloqueador.rollback();
                }
            }
        }
    }

    @Test
    void revogacaoConfirmadaDuranteAquisicaoDaSessaoImpedeOperacao() throws Exception {
        try (var c = new MesasCenario(mvc, mapper); var bloqueador = c.base.banco();
                var executor = Executors.newSingleThreadExecutor()) {
            var comanda = c.comanda(c.abrir());
            String sessao = c.base.json(c.base.enviar("GET", "/api/v1/auth/me", c.base.token, null)).get("sessaoId").asText();
            bloqueador.setAutoCommit(false);
            try (var sql = bloqueador.createStatement()) {
                sql.execute("update " + c.base.schema + ".sessao set revogada_em=clock_timestamp() where id='" + sessao + "'");
                int barreira = pid(bloqueador);
                // O filtro ainda enxerga a sessão ativa: a revogação não confirmou.
                var fechamento = executor.submit(() -> c.estado(comanda, "iniciar-fechamento", 0).getStatus());
                try {
                    assertThat(aguardarBloqueio(c.base, barreira, fechamento))
                            .as("A autorização transacional deve esperar a atualização da sessão.").isPositive();
                    bloqueador.commit();
                    assertThat(fechamento.get(15, TimeUnit.SECONDS)).isEqualTo(401);
                    try (var consulta = c.base.banco(); var estado = consulta.createStatement();
                            var linhas = estado.executeQuery("select estado from " + c.base.schema + ".comanda where id='" + comanda + "'")) {
                        assertThat(linhas.next()).isTrue();
                        assertThat(linhas.getString(1)).isEqualTo("ABERTA");
                    }
                    assertThat(c.base.contar("evento_operacional")).isEqualTo(2);
                } finally {
                    bloqueador.rollback();
                }
            }
        }
    }

    @Test
    void consultaRepeatableReadNaoTransformaRevogacaoConcorrenteEmErroInterno() throws Exception {
        try (var p = new PedidosCenario(mvc, mapper); var bloqueador = p.banco();
                var executor = Executors.newSingleThreadExecutor()) {
            var pedido = p.enviar(p.entrada(1));
            String sessao = p.c.json(p.c.enviar("GET", "/api/v1/auth/me", p.c.token, null)).get("sessaoId").asText();
            String refresh = refreshControlado(p.c, sessao);
            String rota = "/api/v1/operacao/pedidos/" + pedido.get("id").asText();
            bloqueador.setAutoCommit(false);
            try (var sql = bloqueador.createStatement()) {
                sql.execute("select id from " + p.c.schema + ".politica_acesso where id=1 for update");
                int barreira = pid(bloqueador);
                var consulta = executor.submit(() -> p.c.enviar("GET", rota, p.c.token, null));
                try {
                    // O pedido já estabeleceu o snapshot RR antes da espera pela política.
                    assertThat(aguardarBloqueio(p.c, barreira, consulta)).isPositive();
                    assertThat(logout(p.c, refresh)).isEqualTo(204);
                    bloqueador.commit();
                    var resposta = consulta.get(15, TimeUnit.SECONDS);
                    assertThat(resposta.getStatus()).isEqualTo(409);
                    assertThat(p.c.json(resposta).get("codigo").asText()).isEqualTo("SESSAO_ALTERADA");
                    assertThat(resposta.getContentAsString()).doesNotContain("primeiroPreparoEm", "unidades", "saldo");
                    assertThat(p.c.enviar("GET", rota, p.c.token, null).getStatus()).isEqualTo(401);
                } finally {
                    bloqueador.rollback();
                }
            }
        }
    }

    private String refreshControlado(CatalogoCenario c, String sessao) throws Exception {
        byte[] bytes = new byte[32];
        new SecureRandom().nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String hash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(raw.getBytes(StandardCharsets.UTF_8)));
        // Fixture identificada para o logout da mesma sessão usada pelo comando concorrente.
        c.executar("insert into " + c.schema + ".refresh_token(hash,sessao_id) values ('" + hash + "','" + sessao + "')");
        return raw;
    }

    private int logout(CatalogoCenario c, String refresh) throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf").header("Host", c.host)).andReturn().getResponse();
        var dados = c.json(csrf);
        return mvc.perform(post("/api/v1/auth/logout").header("Host", c.host)
                        .cookie(csrf.getCookie("__Host-RM_CSRF"), new Cookie("RM_REFRESH", refresh))
                        .header(dados.get("headerName").asText(), dados.get("token").asText()))
                .andReturn().getResponse().getStatus();
    }

    private int pid(Connection conexao) throws Exception {
        try (var sql = conexao.createStatement(); var linhas = sql.executeQuery("select pg_backend_pid()")) {
            linhas.next();
            return linhas.getInt(1);
        }
    }

    private int aguardarBloqueio(CatalogoCenario c, int bloqueador, Future<?> requisicao) throws Exception {
        Instant limite = Instant.now().plusSeconds(10);
        try (var observador = c.banco(); var sql = observador.prepareStatement(
                "select pid from pg_stat_activity where datname=current_database() and usename='rm_test_app' "
                        + "and ?=any(pg_blocking_pids(pid))")) {
            sql.setInt(1, bloqueador);
            while (Instant.now().isBefore(limite)) {
                try (var linhas = sql.executeQuery()) {
                    if (linhas.next()) return linhas.getInt(1);
                }
                if (requisicao.isDone()) return 0;
                LockSupport.parkNanos(Duration.ofMillis(10).toNanos());
            }
        }
        throw new AssertionError("A requisição não atingiu a barreira PostgreSQL em dez segundos.");
    }
}
