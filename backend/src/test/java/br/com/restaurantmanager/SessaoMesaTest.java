package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class SessaoMesaTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @Test
    void codigoNaoEstaNoQrEJwtDeMesaTemAudienciaRestrita() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            var atendimento = c.abrir();
            assertThat(c.autenticar("autorizar", Map.of("mesaId", c.mesa, "codigo", "AAAAAAAAAA"), null).getStatus()).isEqualTo(401);
            var autenticada = c.autorizar(atendimento);
            String token = c.token(autenticada);
            var cookie = autenticada.getCookie("RM_MESA_REFRESH");
            assertThat(cookie).isNotNull();
            assertThat(cookie.getSecure()).isTrue();
            assertThat(cookie.isHttpOnly()).isTrue();
            assertThat(cookie.getPath()).isEqualTo("/api/v1/mesa/auth");
            assertThat(cookie.getAttribute("SameSite")).isEqualTo("Strict");
            assertThat(c.base.json(autenticada).get("expiresIn").asLong()).isEqualTo(300);
            assertThat(c.base.enviar("GET", "/api/v1/mesa/sessao", token, null).getStatus()).isEqualTo(200);
            assertThat(c.base.enviar("GET", "/api/v1/auth/me", token, null).getStatus()).isEqualTo(401);
            assertThat(c.base.enviar("GET", "/api/v1/mesa/sessao", c.base.token, null).getStatus()).isEqualTo(401);
            assertThat(c.base.enviar("GET", "/api/v1/comandas/" + c.comanda(atendimento), token, null).getStatus()).isEqualTo(401);
            assertThat(c.base.contar("participante_mesa")).isEqualTo(1);
            try (var banco = c.base.banco(); var stmt = banco.createStatement();
                    var rows = stmt.executeQuery("select codigo_hash from " + c.base.schema + ".atendimento")) {
                rows.next();
                assertThat(rows.getString(1)).hasSize(64).isNotEqualTo(atendimento.get("codigoTemporario").asText());
            }
        }
    }

    @Test
    void csrfRealProtegeAutorizarERefreshMesmoComBearer() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            var atendimento = c.abrir();
            var body = Map.of("mesaId", c.mesa, "codigo", atendimento.get("codigoTemporario").asText());
            var semCsrf = mvc.perform(post("/api/v1/mesa/auth/autorizar").header("Host", c.base.host)
                    .header("Authorization", "Bearer " + c.base.token).contentType("application/json")
                    .content(mapper.writeValueAsString(body))).andReturn().getResponse();
            assertThat(semCsrf.getStatus()).isEqualTo(403);
            assertThat(c.base.contar("participante_mesa")).isZero();
            var autenticada = c.autorizar(atendimento);
            var refresh = mvc.perform(post("/api/v1/mesa/auth/refresh").header("Host", c.base.host)
                    .cookie(autenticada.getCookie("RM_MESA_REFRESH"))).andReturn().getResponse();
            assertThat(refresh.getStatus()).isEqualTo(403);
        }
    }

    @Test
    void rotacaoRevogaCodigoAnteriorSemReaproveitarAutorizacaoDoProximoGrupo() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            var atendimento = c.abrir();
            String participante = c.token(c.autorizar(atendimento));
            var rotacao = c.base.enviar("POST", "/api/v1/operacao/mesas/" + c.mesa + "/codigo", c.base.token, Map.of("versao", 0));
            assertThat(rotacao.getStatus()).isEqualTo(200);
            assertThat(c.base.json(rotacao).get("codigoTemporario")).isNotEqualTo(atendimento.get("codigoTemporario"));
            assertThat(c.autorizar(atendimento).getStatus()).isEqualTo(401);
            assertThat(c.autorizar(c.base.json(rotacao)).getStatus()).isEqualTo(200);
            assertThat(c.base.enviar("GET", "/api/v1/mesa/sessao", participante, null).getStatus()).isEqualTo(200);
            assertThat(c.base.enviar("POST", "/api/v1/operacao/mesas/" + c.mesa + "/codigo", c.base.token, Map.of("versao", 0)).getStatus()).isEqualTo(409);
        }
    }

    @Test
    void refreshRotativoRejeitaReplayERevogaTambemAccessAtual() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            var autenticada = c.autorizar(c.abrir());
            var antiga = autenticada.getCookie("RM_MESA_REFRESH");
            var renovada = c.autenticar("refresh", null, antiga);
            String atual = c.token(renovada);
            assertThat(renovada.getCookie("RM_MESA_REFRESH").getValue()).isNotEqualTo(antiga.getValue());
            assertThat(c.autenticar("refresh", null, antiga).getStatus()).isEqualTo(401);
            assertThat(c.base.enviar("GET", "/api/v1/mesa/sessao", atual, null).getStatus()).isEqualTo(401);
            assertThat(c.autenticar("refresh", null, renovada.getCookie("RM_MESA_REFRESH")).getStatus()).isEqualTo(401);
        }
    }

    @Test
    void doisRefreshConcorrentesNaoMantemDuasFamiliasValidas() throws Exception {
        try (var c = new MesasCenario(mvc, mapper); var executor = Executors.newFixedThreadPool(2)) {
            var autenticada = c.autorizar(c.abrir());
            var cookie = autenticada.getCookie("RM_MESA_REFRESH");
            var barreira = new CyclicBarrier(2);
            var a = executor.submit(() -> {
                barreira.await(10, TimeUnit.SECONDS);
                return c.autenticar("refresh", null, cookie);
            });
            var b = executor.submit(() -> {
                barreira.await(10, TimeUnit.SECONDS);
                return c.autenticar("refresh", null, cookie);
            });
            var ra = a.get(20, TimeUnit.SECONDS);
            var rb = b.get(20, TimeUnit.SECONDS);
            assertThat(List.of(ra.getStatus(), rb.getStatus())).containsExactlyInAnyOrder(200, 401);
            String emitido = c.token(ra.getStatus() == 200 ? ra : rb);
            assertThat(c.base.enviar("GET", "/api/v1/mesa/sessao", emitido, null).getStatus()).isEqualTo(401);
        }
    }

    @Test
    void prazoAbsolutoLogoutEIsolamentoTenantSaoRevalidados() throws Exception {
        try (var c = new MesasCenario(mvc, mapper); var outro = new MesasCenario(mvc, mapper)) {
            var autenticada = c.autorizar(c.abrir());
            String token = c.token(autenticada);
            assertThat(outro.base.enviar("GET", "/api/v1/mesa/sessao", token, null).getStatus()).isEqualTo(401);
            c.base.executar("update " + c.base.schema + ".sessao_mesa set expira_em=current_timestamp-interval '1 second'");
            assertThat(c.base.enviar("GET", "/api/v1/mesa/sessao", token, null).getStatus()).isEqualTo(401);
            assertThat(c.autenticar("refresh", null, autenticada.getCookie("RM_MESA_REFRESH")).getStatus()).isEqualTo(401);
            var ativa = outro.autorizar(outro.abrir());
            String tokenAtivo = outro.token(ativa);
            assertThat(outro.autenticar("logout", null, ativa.getCookie("RM_MESA_REFRESH")).getStatus()).isEqualTo(204);
            assertThat(outro.base.enviar("GET", "/api/v1/mesa/sessao", tokenAtivo, null).getStatus()).isEqualTo(401);
        }
    }

    @Test
    void quotaPersisteMesmoQuandoCodigoInvalidoERespostaNaoRevelaMesa() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            c.abrir();
            for (int tentativa = 0; tentativa < 5; tentativa++) {
                var negada = c.autenticar("autorizar", Map.of("mesaId", c.mesa, "codigo", "AAAAAAAAAA"), null);
                assertThat(negada.getStatus()).isEqualTo(401);
                assertThat(negada.getContentAsString()).doesNotContain(c.mesa.toString(), "codigo_hash", "Mesa 01");
            }
            assertThat(c.autenticar("autorizar", Map.of("mesaId", c.mesa, "codigo", "AAAAAAAAAA"), null).getStatus()).isEqualTo(429);
            assertThat(c.base.contar("participante_mesa")).isZero();
            assertThat(c.autenticar("autorizar", Map.of("mesaId", UUID.randomUUID(), "codigo", "AAAAAAAAAA"), null).getStatus()).isEqualTo(401);
        }
    }
}
