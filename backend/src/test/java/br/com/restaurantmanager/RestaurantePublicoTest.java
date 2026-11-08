package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class RestaurantePublicoTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @Test
    void retornaSomenteNomeDoHostRegistradoIgnorandoContextosDoChamador() throws Exception {
        mvc.perform(get("/api/v1/restaurante").header("Host", "a.localhost")
                        .header("X-Tenant", FundacaoTest.B).header("Forwarded", "host=b.localhost"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nome").value("Empresa fictícia a"))
                .andExpect(jsonPath("$.length()").value(1));
        mvc.perform(get("/api/v1/restaurante").header("Host", "b.localhost"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.nome").value("Empresa fictícia b"));
        mvc.perform(get("/api/v1/restaurante").header("Host", "invasor.localhost"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.codigo").value("EMPRESA_INDISPONIVEL"));
    }

    @Test
    void suspensaoPreservaNomeMasEmpresasNaoProvisionadasFicamIndisponiveis() throws Exception {
        try (var c = new CatalogoCenario(mvc, mapper)) {
            c.executar("update public.empresa set estado='SUSPENSO' where id='" + c.empresa + "'");
            var resposta = c.enviar("GET", "/api/v1/restaurante", null, null);
            assertThat(resposta.getStatus()).isEqualTo(200);
            assertThat(c.json(resposta).get("nome").asText()).isEqualTo("Catálogo fictício");
            for (String estado : new String[]{"PROVISIONANDO", "FALHOU"}) {
                c.executar("update public.empresa set estado='" + estado + "' where id='" + c.empresa + "'");
                assertThat(c.enviar("GET", "/api/v1/restaurante", null, null).getStatus()).isEqualTo(404);
            }
        }
    }
}
