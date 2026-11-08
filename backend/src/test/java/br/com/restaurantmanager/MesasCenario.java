package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import jakarta.servlet.http.Cookie;
import java.util.Map;
import java.util.UUID;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

final class MesasCenario implements AutoCloseable {
    final CatalogoCenario base;
    final UUID mesa = UUID.randomUUID();
    final MockMvc mvc;
    final ObjectMapper mapper;

    MesasCenario(MockMvc mvc, ObjectMapper mapper) throws Exception {
        this.mvc = mvc;
        this.mapper = mapper;
        this.base = new CatalogoCenario(mvc, mapper);
        base.executar("insert into " + base.schema + ".mesa(id,unidade_id,nome) values ('" + mesa + "','" + CatalogoCenario.UNIDADE + "','Mesa 01')");
        base.executar("insert into " + base.schema + ".funcionamento_unidade(unidade_id,versao,mesa) values ('" + CatalogoCenario.UNIDADE + "',1,true)");
        base.executar("insert into " + base.schema + ".horario_unidade(unidade_id,canal,dia_semana,inicio_minuto,fim_minuto) "
                + "select '" + CatalogoCenario.UNIDADE + "','MESA',dia,0,1440 from generate_series(1,7) dia");
    }

    JsonNode abrir() throws Exception {
        var resposta = abrir(UUID.randomUUID(), base.token);
        assertThat(resposta.getStatus()).isEqualTo(200);
        return base.json(resposta);
    }

    MockHttpServletResponse abrir(UUID intencao, String token) throws Exception {
        return base.enviar("POST", "/api/v1/operacao/mesas/" + mesa + "/abrir", token, Map.of("intencaoId", intencao));
    }

    MockHttpServletResponse autorizar(JsonNode atendimento) throws Exception {
        return autenticar("autorizar", Map.of("mesaId", mesa, "codigo", atendimento.get("codigoTemporario").asText()), null);
    }

    MockHttpServletResponse autenticar(String acao, Object body, Cookie refresh) throws Exception {
        var csrf = mvc.perform(get("/api/v1/mesa/auth/csrf").header("Host", base.host)).andReturn().getResponse();
        var dados = base.json(csrf);
        var request = post("/api/v1/mesa/auth/" + acao).header("Host", base.host)
                .cookie(csrf.getCookie("__Host-RM_MESA_CSRF"))
                .header(dados.get("headerName").asText(), dados.get("token").asText());
        if (body != null) request.contentType("application/json").content(mapper.writeValueAsString(body));
        if (refresh != null) request.cookie(refresh);
        return mvc.perform(request).andReturn().getResponse();
    }

    String token(MockHttpServletResponse resposta) {
        assertThat(resposta.getStatus()).isEqualTo(200);
        return base.json(resposta).get("accessToken").asText();
    }

    MockHttpServletResponse estado(UUID comanda, String comando, long versao) throws Exception {
        return base.enviar("POST", "/api/v1/comandas/" + comanda + "/" + comando, base.token, Map.of("versao", versao));
    }

    UUID comanda(JsonNode atendimento) {
        return UUID.fromString(atendimento.get("comandaId").asText());
    }

    String funcionario(String perfil, UUID unidade) throws Exception {
        UUID usuario = base.usuario(perfil);
        base.vincular(usuario, unidade);
        return base.login(usuario);
    }

    @Override
    public void close() throws Exception {
        base.close();
    }
}
