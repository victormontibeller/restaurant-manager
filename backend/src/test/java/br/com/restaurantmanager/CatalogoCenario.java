package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;

import br.com.restaurantmanager.catalogo.dtos.Adicional;
import br.com.restaurantmanager.catalogo.dtos.Categoria;
import br.com.restaurantmanager.catalogo.dtos.Grupo;
import br.com.restaurantmanager.catalogo.dtos.Produto;
import br.com.restaurantmanager.catalogo.models.TipoProduto;
import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpMethod;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Massa exclusiva de um tenant por cenário; os testes expressam a jornada diretamente. */
final class CatalogoCenario implements AutoCloseable {
    static final UUID UNIDADE = UUID.fromString("11111111-1111-1111-1111-111111111111");
    static final UUID OUTRA_UNIDADE = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final String SENHA = UUID.randomUUID().toString();
    private static final String HASH = new BCryptPasswordEncoder(12).encode(SENHA);
    private final MockMvc mvc;
    private final ObjectMapper mapper;
    final UUID empresa = UUID.randomUUID();
    final String schema = "t_" + empresa.toString().replace("-", "");
    final String host = "catalogo-" + empresa + ".localhost";
    final UUID administrador;
    final String token;

    CatalogoCenario(MockMvc mvc, ObjectMapper mapper) throws Exception {
        this.mvc = mvc;
        this.mapper = mapper;
        TestDatabase.migrate(schema, "tenant");
        executar("insert into public.empresa(id,nome,schema_name,estado) values ('" + empresa + "','Catálogo fictício','" + schema + "','ATIVO')");
        executar("insert into public.dominio(host,empresa_id) values ('" + host + "','" + empresa + "')");
        executar("insert into " + schema + ".unidade(id,nome) values ('" + UNIDADE + "','Centro'),('" + OUTRA_UNIDADE + "','Praia')");
        administrador = usuario("ADMINISTRADOR");
        token = login(administrador);
    }

    UUID usuario(String perfil) throws Exception {
        UUID id = UUID.randomUUID();
        try (var conexao = banco(); var sql = conexao.prepareStatement("insert into " + schema
                + ".usuario(id,email,senha_hash,perfil,email_verificado) values (?,?,?,?,true)")) {
            sql.setObject(1, id);
            sql.setString(2, id + "@example.invalid");
            sql.setString(3, HASH);
            sql.setString(4, perfil);
            sql.executeUpdate();
        }
        return id;
    }

    void vincular(UUID usuario, UUID unidade) throws Exception {
        executar("insert into " + schema + ".usuario_unidade(usuario_id,unidade_id) values ('" + usuario + "','" + unidade + "')");
    }

    String login(UUID usuario) throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf").header("Host", host)).andReturn().getResponse();
        var dados = json(csrf);
        var resposta = mvc.perform(post("/api/v1/auth/login").header("Host", host)
                .cookie(csrf.getCookie("__Host-RM_CSRF"))
                .header(dados.get("headerName").asText(), dados.get("token").asText())
                .contentType("application/json").content(mapper.writeValueAsString(Map.of(
                        "email", usuario + "@example.invalid", "senha", SENHA)))).andReturn().getResponse();
        assertThat(resposta.getStatus()).isEqualTo(200);
        return json(resposta).get("accessToken").asText();
    }

    MockHttpServletResponse enviar(String metodo, String caminho, String access, Object body) throws Exception {
        return enviarJson(metodo, caminho, access, body == null ? null : mapper.writeValueAsString(body));
    }

    void reautenticar() throws Exception {
        assertThat(enviar("POST", "/api/v1/auth/reautenticar", token, Map.of("senha", SENHA)).getStatus())
                .isEqualTo(204);
    }

    void configurarAcoes(String perfil, List<String> acoes) throws Exception {
        String rota = "/api/v1/configuracoes/acessos";
        var atual = json(enviar("GET", rota, token, null));
        var resposta = enviar("PUT", rota, token,
                Map.of("versao", atual.get("versao").asLong(), "perfil", perfil, "acoes", acoes));
        assertThat(resposta.getStatus()).isEqualTo(200);
    }

    MockHttpServletResponse enviarJson(String metodo, String caminho, String access, String body) throws Exception {
        var requisicao = request(HttpMethod.valueOf(metodo), caminho).header("Host", host);
        if (access != null) requisicao.header("Authorization", "Bearer " + access);
        if (body != null) requisicao.contentType("application/json").content(body);
        return mvc.perform(requisicao).andReturn().getResponse();
    }

    Categoria categoria(String nome) throws Exception {
        var categoria = new Categoria(UUID.randomUUID(), nome, true, 0L);
        assertThat(enviar("POST", "/api/v1/gestao/catalogo/categorias", token, categoria).getStatus()).isEqualTo(200);
        return categoria;
    }

    Produto produto(Categoria categoria, String nome, List<Adicional> adicionais, List<Grupo> grupos) throws Exception {
        var produto = new Produto(UUID.randomUUID(), 0L, nome, "Descrição pública", categoria.id(),
                grupos.isEmpty() ? TipoProduto.SIMPLES : TipoProduto.COMBO, true, false, null, adicionais, grupos);
        assertThat(enviar("POST", "/api/v1/gestao/catalogo/produtos", token, produto).getStatus()).isEqualTo(200);
        return produto;
    }

    void ofertar(UUID produto, UUID unidade, String preco, boolean disponivel) throws Exception {
        var atual = json(enviar("GET", oferta(produto, unidade), token, null));
        var alteracao = Map.of("versao", atual.get("versao").asLong(), "preco", preco,
                "disponivel", disponivel, "canais", List.of("DELIVERY", "RETIRADA"));
        assertThat(enviar("PUT", oferta(produto, unidade), token, alteracao).getStatus()).isEqualTo(200);
    }

    void abrir(UUID unidade) throws Exception {
        executar("insert into " + schema + ".funcionamento_unidade(unidade_id,versao,delivery) values ('" + unidade + "',1,true)");
        executar("insert into " + schema + ".horario_unidade(unidade_id,canal,dia_semana,inicio_minuto,fim_minuto) "
                + "select '" + unidade + "','DELIVERY',dia,0,1440 from generate_series(1,7) dia");
    }

    String publico(UUID produto) {
        return "/api/v1/catalogo/" + produto + "?unidadeId=" + UNIDADE + "&canal=DELIVERY";
    }

    String oferta(UUID produto, UUID unidade) {
        return "/api/v1/gestao/catalogo/produtos/" + produto + "/unidades/" + unidade;
    }

    JsonNode json(MockHttpServletResponse resposta) {
        return mapper.readTree(resposta.getContentAsByteArray());
    }

    Connection banco() throws Exception {
        var conexao = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"),
                System.getenv("RM_MIGRATION_PASSWORD"));
        Migrations.verifyIdentity(conexao, "rm_test", "rm_test_owner");
        return conexao;
    }

    void executar(String comando) throws Exception {
        try (var conexao = banco(); var statement = conexao.createStatement()) {
            statement.execute(comando);
        }
    }

    long contar(String tabela) throws Exception {
        try (var conexao = banco(); var statement = conexao.createStatement();
                var resultado = statement.executeQuery("select count(*) from " + schema + "." + tabela)) {
            resultado.next();
            return resultado.getLong(1);
        }
    }

    @Override
    public void close() throws Exception {
        executar("delete from public.dominio where empresa_id='" + empresa + "'");
        executar("delete from public.empresa where id='" + empresa + "'");
        executar("drop schema if exists " + schema + " cascade");
    }
}
