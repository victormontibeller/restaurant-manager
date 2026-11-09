package br.com.restaurantmanager;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.forwardedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
        mvc.perform(get(rota).header("Host", "a.localhost")).andExpect(status().isOk())
                .andExpect(forwardedUrl("/index.html"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"/desconhecido", "/gestao/desconhecido", "/pedidos/invalido", "/mesa/invalida",
            "/api/v1/desconhecido", "/api/v1/operacao/pedidos", "/actuator/env", "/error"})
    void fallbackNaoCapturaOutrasRotasNemApi(String rota) throws Exception {
        mvc.perform(get(rota).header("Host", "a.localhost")).andExpect(status().isUnauthorized())
                .andExpect(forwardedUrl(null));
    }

    @Test
    void fallbackNaoAceitaEscrita() throws Exception {
        mvc.perform(post("/cardapio").header("Host", "a.localhost"))
                .andExpect(status().isForbidden()).andExpect(forwardedUrl(null));
    }
}
