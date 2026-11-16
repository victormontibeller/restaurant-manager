package br.com.restaurantmanager;

import static org.hamcrest.Matchers.allOf;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class FrontendRotasTest {
    @Autowired MockMvc mvc;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @ParameterizedTest
    @ValueSource(strings = {"/cardapio", "/carrinho", "/entrar", "/cadastro", "/recuperar-senha", "/verificar-email",
            "/aceitar-convite", "/conta", "/pedidos", "/pedidos/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "/mesa", "/mesa/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "/sem-acesso", "/gestao", "/gestao/entrar",
            "/gestao/pedidos", "/gestao/pedidos/novo", "/gestao/mesas", "/gestao/catalogo", "/gestao/equipe",
            "/gestao/equipe/convites", "/gestao/convites", "/gestao/acessos", "/gestao/unidades",
            "/gestao/configuracoes/prazos", "/gestao/atualizacoes", "/cozinha", "/plataforma", "/design-system"})
    void linkDiretoRetornaShellSemExigirSessao(String rota) throws Exception {
        mvc.perform(get(rota).header("Host", "a.localhost").accept(MediaType.TEXT_HTML))
                .andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/desconhecido", "/rota/desconhecida", "/pedidos/invalido", "/mesa/invalida",
            "/mesa/código inválido"})
    void linkPublicoInvalidoRetornaPagina404(String rota) throws Exception {
        mvc.perform(get(rota).header("Host", "a.localhost")
                        .accept("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8")
                        .queryParam("termo", "nao-refletir-este-valor"))
                .andExpect(status().isNotFound())
                .andExpect(content().contentType("text/html;charset=UTF-8"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(header().string(HttpHeaders.VARY, HttpHeaders.ACCEPT))
                .andExpect(forwardedUrl(null))
                .andExpect(content().string(allOf(
                        containsString("Essa página saiu do cardápio."),
                        containsString("href=\"/cardapio\">Ver cardápio"),
                        containsString("href=\"/mesa\">Minha mesa"),
                        not(containsString("nao-refletir-este-valor")))));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/desconhecido", "/gestao/desconhecido", "/pedidos/invalido", "/mesa/invalida",
            "/api/v1/desconhecido", "/api/v1/operacao/pedidos", "/actuator/env", "/error"})
    void requisicaoSemPreferenciaHtmlPreservaRespostaDaSeguranca(String rota) throws Exception {
        mvc.perform(get(rota).header("Host", "a.localhost")).andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(forwardedUrl(null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"*/*", "application/json", "text/html;q=0, */*;q=1"})
    void negociacaoHtmlPrecisaSerExplicitaEPositiva(String accept) throws Exception {
        mvc.perform(get("/desconhecido").header("Host", "a.localhost").accept(accept))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/desconhecido", "/api/v1/operacao/pedidos", "/actuator/env",
            "/assets/inexistente", "/icons/inexistente", "/arquivo-inexistente.html",
            "/gestao/desconhecido", "/cozinha/desconhecido", "/plataforma/desconhecido", "/error"})
    void fallbackNaoCapturaNamespacesReservadosMesmoComAcceptHtml(String rota) throws Exception {
        mvc.perform(get(rota).header("Host", "a.localhost").accept(MediaType.TEXT_HTML))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(forwardedUrl(null));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/cardapio", "/desconhecido"})
    void fallbackNaoAceitaEscrita(String rota) throws Exception {
        mvc.perform(post(rota).header("Host", "a.localhost").accept(MediaType.TEXT_HTML))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(forwardedUrl(null));
    }
}
