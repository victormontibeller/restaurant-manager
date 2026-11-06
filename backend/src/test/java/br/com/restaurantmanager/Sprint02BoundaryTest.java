package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import jakarta.servlet.http.Cookie;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

/** Fronteiras HTTP; regras de catálogo/cálculo ficam nas suítes dos respectivos domínios. */
@SpringBootTest
@AutoConfigureMockMvc
class Sprint02BoundaryTest {
    private static final String HOST = "a.localhost";
    private static final String ID = "11111111-1111-1111-1111-111111111111";

    @Autowired MockMvc mvc;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @Test
    void catalogoEMidiaPublicosChegamAoContratoSemAutenticacao() throws Exception {
        for (String caminho : List.of("/api/v1/catalogo", "/api/v1/catalogo/" + ID)) {
            var resposta = mvc.perform(get(caminho).header("Host", HOST)).andReturn().getResponse();
            assertThat(resposta.getStatus()).isEqualTo(400);
            assertThat(resposta.getHeader("Cache-Control")).contains("no-store");
        }
        assertThat(mvc.perform(get("/api/v1/midias/" + UUID.randomUUID()).header("Host", HOST))
                .andReturn().getResponse().getStatus()).isEqualTo(404);
    }

    @Test
    void somenteCalculoPublicoDispensaCsrfSemTransformarCookieEmIdentidade() throws Exception {
        var resposta = mvc.perform(post("/api/v1/carrinho/calcular").header("Host", HOST)
                .cookie(new Cookie("RM_REFRESH", "cookie-ficticio-sem-identidade"))
                .contentType("application/json").content("{}"))
                .andReturn().getResponse();
        assertThat(resposta.getStatus()).isEqualTo(400);
        assertThat(resposta.getContentAsString()).doesNotContain("ACESSO_NEGADO", "AUTENTICACAO_NECESSARIA");
        assertThat(resposta.getHeader("Cache-Control")).contains("no-store");

        assertThat(mvc.perform(post("/api/v1/gestao/catalogo/produtos").header("Host", HOST)
                .contentType("application/json").content("{}"))
                .andReturn().getResponse().getStatus()).isEqualTo(403);
        assertThat(mvc.perform(get("/api/v1/clientes/me/favoritos").header("Host", HOST)
                .cookie(new Cookie("RM_REFRESH", "cookie-ficticio-sem-identidade")))
                .andReturn().getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void consultasPrivadasExigemBearerMesmoQuandoUuidEPublico() throws Exception {
        for (String caminho : List.of(
                "/api/v1/gestao/catalogo/categorias", "/api/v1/gestao/catalogo/produtos",
                "/api/v1/gestao/catalogo/produtos/" + ID,
                "/api/v1/gestao/catalogo/produtos/" + ID + "/unidades/" + ID,
                "/api/v1/operacao/catalogo", "/api/v1/gestao/midias/" + ID,
                "/api/v1/clientes/me/favoritos")) {
            var resposta = mvc.perform(get(caminho).header("Host", HOST)).andReturn().getResponse();
            assertThat(resposta.getStatus()).as(caminho).isEqualTo(401);
            assertThat(resposta.getContentAsString()).contains("AUTENTICACAO_NECESSARIA");
        }
    }

    @Test
    void csrfValidoNaoConcedeEscritasPrivadas() throws Exception {
        for (String caminho : List.of("/api/v1/gestao/catalogo/categorias", "/api/v1/gestao/catalogo/produtos")) {
            assertThat(mvc.perform(post(caminho).with(csrf()).header("Host", HOST)
                    .contentType("application/json").content("{}"))
                    .andReturn().getResponse().getStatus()).as(caminho).isEqualTo(401);
        }
        for (String caminho : List.of("/api/v1/gestao/catalogo/categorias/" + ID,
                "/api/v1/gestao/catalogo/produtos/" + ID,
                "/api/v1/gestao/catalogo/produtos/" + ID + "/unidades/" + ID,
                "/api/v1/clientes/me/favoritos/" + ID)) {
            assertThat(mvc.perform(put(caminho).with(csrf()).header("Host", HOST)
                    .contentType("application/json").content("{}"))
                    .andReturn().getResponse().getStatus()).as(caminho).isEqualTo(401);
        }
        assertThat(mvc.perform(delete("/api/v1/clientes/me/favoritos/" + ID).with(csrf()).header("Host", HOST))
                .andReturn().getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void allowlistNaoLiberaVerbosOuSubcaminhosAdicionais() throws Exception {
        assertThat(mvc.perform(get("/api/v1/carrinho/calcular").header("Host", HOST))
                .andReturn().getResponse().getStatus()).isEqualTo(401);
        for (String caminho : List.of("/api/v1/catalogo", "/api/v1/catalogo/" + ID,
                "/api/v1/midias/" + ID, "/api/v1/carrinho/calcular/confirmar", "/api/v1/pedidos")) {
            assertThat(mvc.perform(post(caminho).with(csrf()).header("Host", HOST)
                    .contentType("application/json").content("{}"))
                    .andReturn().getResponse().getStatus()).as(caminho).isEqualTo(401);
        }
        for (String caminho : List.of("/api/v1/midias/" + ID + "/privado", "/api/v1/catalogo/" + ID + "/auditoria")) {
            assertThat(mvc.perform(get(caminho).header("Host", HOST)).andReturn().getResponse().getStatus())
                    .as(caminho).isEqualTo(401);
        }
    }

    @Test
    void contextoPublicoTambemResolveTenantERecusaBearerInvalido() throws Exception {
        for (String host : List.of("tenant-inexistente.localhost", "plataforma.localhost")) {
            assertThat(mvc.perform(get("/api/v1/catalogo").header("Host", host))
                    .andReturn().getResponse().getStatus()).isEqualTo(404);
            assertThat(mvc.perform(post("/api/v1/carrinho/calcular").header("Host", host)
                    .contentType("application/json").content("{}"))
                    .andReturn().getResponse().getStatus()).isEqualTo(404);
        }
        assertThat(mvc.perform(get("/api/v1/catalogo").header("Host", HOST)
                .header("Authorization", "Bearer credencial-invalida"))
                .andReturn().getResponse().getStatus()).isEqualTo(401);
    }
}
