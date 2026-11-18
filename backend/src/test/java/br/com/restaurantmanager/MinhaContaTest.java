package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
class MinhaContaTest {
    private static final String PERFIL = "/api/v1/me/perfil";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @Test
    void clienteCompletaDadosOpcionaisESomenteSuaContaMuda() throws Exception {
        try (var c = new CatalogoCenario(mvc, mapper)) {
            var id = c.usuario("CLIENTE");
            var cliente = c.login(id);
            var anterior = c.enviar("GET", PERFIL, cliente, null);
            assertThat(anterior.getHeader("Cache-Control")).contains("no-store");
            var conta = c.json(anterior);
            assertThat(conta.get("email").asText()).isEqualTo(id + "@example.invalid");
            assertThat(conta.get("criadoEm").asText()).isNotBlank();
            assertThat(conta.get("nome").isNull()).isTrue();
            assertThat(conta.get("telefone").isNull()).isTrue();
            assertThat(conta.get("unidades").isEmpty()).isTrue();
            var edicao = Map.of("versao", 0, "nome", " Ana Souza ", "telefone", "+55 (11) 99999-0000");
            var resposta = c.enviar("PUT", PERFIL, cliente, edicao);
            assertThat(resposta.getStatus()).isEqualTo(200);
            var salvo = c.json(resposta);
            assertThat(salvo.get("nome").asText()).isEqualTo("Ana Souza");
            assertThat(salvo.get("telefone").asText()).isEqualTo("+5511999990000");
            assertThat(salvo.get("versao").asLong()).isEqualTo(1);
            assertThat(c.enviar("PUT", PERFIL, cliente, edicao).getStatus()).isEqualTo(409);
            assertThat(c.json(c.enviar("GET", PERFIL, cliente, null))).isEqualTo(salvo);
            assertThat(c.json(c.enviar("GET", PERFIL, c.token, null)).get("nome").isNull()).isTrue();
            var removido = c.json(c.enviar("PUT", PERFIL, cliente, Map.of("versao", 1, "nome", "", "telefone", "")));
            assertThat(removido.get("nome").isNull()).isTrue();
            assertThat(removido.get("telefone").isNull()).isTrue();
        }
    }

    @Test
    void funcionarioConsultaVinculosEfetivosESomenteEditaDadosPessoais() throws Exception {
        try (var c = new CatalogoCenario(mvc, mapper); var outra = new CatalogoCenario(mvc, mapper)) {
            var gerente = c.usuario("GERENTE");
            c.vincular(gerente, CatalogoCenario.UNIDADE);
            var token = c.login(gerente);
            var dados = c.json(c.enviar("PUT", PERFIL, token, Map.of("nome", "Rui", "versao", 0)));
            assertThat(dados.get("perfil").asText()).isEqualTo("GERENTE");
            assertThat(dados.get("nome").asText()).isEqualTo("Rui");
            assertThat(dados.get("unidades").size()).isEqualTo(1);
            assertThat(dados.get("unidades").get(0).get("nome").asText()).isEqualTo("Centro");
            assertThat(c.json(c.enviar("GET", PERFIL, c.token, null)).get("unidades").size()).isEqualTo(2);
            for (String protegido : new String[]{"usuarioId", "perfil", "email", "emailVerificado", "unidades"}) {
                assertThat(c.enviar("PUT", PERFIL, token, Map.of("versao", 1, protegido, "x")).getStatus()).isEqualTo(400);
            }
            assertThat(c.enviar("PUT", PERFIL, token, Map.of("versao", 1, "telefone", "abcdabcde")).getStatus()).isEqualTo(400);
            assertThat(c.enviar("GET", PERFIL, null, null).getStatus()).isEqualTo(401);
            assertThat(outra.enviar("GET", PERFIL, token, null).getStatus()).isEqualTo(401);
        }
    }
}
