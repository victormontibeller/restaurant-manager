package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import br.com.restaurantmanager.identidade.AuthFailure;
import br.com.restaurantmanager.identidade.IdentidadeAtual;
import br.com.restaurantmanager.midia.MidiaService;
import br.com.restaurantmanager.tenancy.Migrations;
import br.com.restaurantmanager.tenancy.TenantScope;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class MidiaTest {
    private static final String SENHA = UUID.randomUUID().toString();
    private static final String HASH = new BCryptPasswordEncoder(12).encode(SENHA);

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired MidiaService midias;

    private final List<Empresa> empresas = new ArrayList<>();
    private Empresa empresa;
    private UUID administrador;
    private String token;
    private byte[] imagem;

    private record Empresa(UUID id, String schema, String host) {}

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void prepararMassaPropria() throws Exception {
        empresa = criarEmpresa();
        administrador = criarUsuario(empresa, "ADMINISTRADOR");
        token = login(empresa, administrador);
        imagem = imagem(0xff336699);
    }

    @AfterEach
    void limparMassaPropria() throws Exception {
        for (var criada : empresas) {
            executar("delete from public.dominio where empresa_id='" + criada.id() + "'");
            executar("delete from public.empresa where id='" + criada.id() + "'");
            executar("drop schema if exists " + criada.schema() + " cascade");
        }
    }

    @Test
    void publicaConteudoSeguroERecuperaMesmaIntencaoSemDuplicar() throws Exception {
        UUID id = UUID.randomUUID();
        var primeira = enviar(empresa, token, id, imagem);
        assertThat(primeira.getStatus()).isEqualTo(201);
        assertThat(primeira.getHeader("Location")).isEqualTo(gestao(id));
        var metadata = json(primeira);
        assertThat(metadata.get("contentType").asText()).isEqualTo("image/png");
        assertThat(metadata.get("sha256").asText()).matches("[a-f0-9]{64}");
        assertThat(metadata.has("autorId")).isFalse();
        assertThat(metadata.has("conteudo")).isFalse();

        var repetida = enviar(empresa, token, id, imagem);
        assertThat(repetida.getStatus()).isEqualTo(200);
        assertThat(json(repetida)).isEqualTo(metadata);
        assertThat(json(consultar(empresa, token, id))).isEqualTo(metadata);
        assertThat(contar("midia")).isEqualTo(1);
        assertThat(contar("auditoria_midia")).isEqualTo(1);
        assertThat(valor("select quantidade from " + empresa.schema() + ".controle_midia")).isEqualTo(1);

        var publica = consultarPublica(empresa, id);
        assertThat(publica.getStatus()).isEqualTo(200);
        assertThat(publica.getContentType()).isEqualTo("image/png");
        assertThat(publica.getHeader("Cache-Control")).contains("no-store");
        assertThat(publica.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(ImageIO.read(new ByteArrayInputStream(publica.getContentAsByteArray())).getWidth()).isEqualTo(16);
    }

    @Test
    void idempotenciaRecusaImagemOuAutorDiferente() throws Exception {
        UUID id = UUID.randomUUID();
        assertThat(enviar(empresa, token, id, imagem).getStatus()).isEqualTo(201);
        assertThat(enviar(empresa, token, id, imagem(0xff995522)).getStatus()).isEqualTo(409);
        String outro = login(empresa, criarUsuario(empresa, "ADMINISTRADOR"));
        assertThat(enviar(empresa, outro, id, imagem).getStatus()).isEqualTo(409);
        assertThat(contar("midia")).isEqualTo(1);
        assertThat(contar("auditoria_midia")).isEqualTo(1);
    }

    @Test
    void tenantAlheioNaoLeOuAlteraMesmaMidia() throws Exception {
        UUID id = UUID.randomUUID();
        assertThat(enviar(empresa, token, id, imagem).getStatus()).isEqualTo(201);
        var outra = criarEmpresa();
        String outro = login(outra, criarUsuario(outra, "ADMINISTRADOR"));

        assertThat(consultarPublica(outra, id).getStatus()).isEqualTo(404);
        assertThat(consultar(outra, outro, id).getStatus()).isEqualTo(404);
        assertThat(enviar(outra, token, id, imagem).getStatus()).isEqualTo(401);
        assertThat(enviar(outra, outro, id, imagem(0xff112244)).getStatus()).isEqualTo(201);
        assertThat(consultarPublica(empresa, id).getContentAsByteArray())
                .isNotEqualTo(consultarPublica(outra, id).getContentAsByteArray());
    }

    @Test
    void exigeAcaoAtualMesmoEmReplayERevogaSessao() throws Exception {
        UUID gerente = criarUsuario(empresa, "GERENTE");
        String credencial = login(empresa, gerente);
        UUID id = UUID.randomUUID();
        executar("delete from " + empresa.schema() + ".permissao_perfil where perfil='GERENTE' and acao='catalogo.editar'");
        assertThat(enviar(empresa, credencial, id, imagem).getStatus()).isEqualTo(403);
        executar("insert into " + empresa.schema() + ".permissao_perfil(perfil,acao) values ('GERENTE','catalogo.editar')");
        assertThat(enviar(empresa, credencial, id, imagem).getStatus()).isEqualTo(201);
        executar("delete from " + empresa.schema() + ".permissao_perfil where perfil='GERENTE' and acao='catalogo.editar'");
        assertThat(enviar(empresa, credencial, id, imagem).getStatus()).isEqualTo(403);
        assertThat(consultar(empresa, credencial, id).getStatus()).isEqualTo(403);
        executar("update " + empresa.schema() + ".sessao set revogada_em=now() where usuario_id='" + administrador + "'");
        assertThat(enviar(empresa, token, UUID.randomUUID(), imagem).getStatus()).isEqualTo(401);
    }

    @Test
    void publicoClientesEPerfisSemAcaoNaoPublicam() throws Exception {
        UUID id = UUID.randomUUID();
        assertThat(mvc.perform(multipart(gestao(id)).file(arquivo(imagem)).with(csrf()).header("Host", empresa.host()))
                .andReturn().getResponse().getStatus()).isEqualTo(401);
        for (String perfil : List.of("CLIENTE", "ATENDIMENTO", "CAIXA", "COZINHA", "EXPEDICAO")) {
            String outro = login(empresa, criarUsuario(empresa, perfil));
            assertThat(enviar(empresa, outro, id, imagem).getStatus()).isEqualTo(403);
        }
        assertThat(contar("midia")).isZero();
    }

    @Test
    void revalidaPermissaoDepoisDaLeituraDoArquivoAntesDePublicar() throws Exception {
        UUID gerente = criarUsuario(empresa, "GERENTE");
        executar("insert into " + empresa.schema()
                + ".permissao_perfil(perfil,acao) values ('GERENTE','catalogo.editar') on conflict do nothing");
        String credencial = login(empresa, gerente);
        var resposta = mvc.perform(get("/api/v1/auth/me").header("Host", empresa.host())
                .header("Authorization", "Bearer " + credencial)).andReturn().getResponse();
        var ator = mapper.readValue(resposta.getContentAsString(), IdentidadeAtual.class);
        var arquivo = new MockMultipartFile("arquivo", "foto.png", "image/png", imagem) {
            @Override
            public InputStream getInputStream() throws IOException {
                try {
                    executar("delete from " + empresa.schema()
                            + ".permissao_perfil where perfil='GERENTE' and acao='catalogo.editar'");
                } catch (Exception erro) {
                    throw new IOException(erro);
                }
                return super.getInputStream();
            }
        };

        try (var scope = TenantScope.open(empresa.schema())) {
            assertThatThrownBy(() -> midias.enviar(ator, UUID.randomUUID(), arquivo))
                    .isInstanceOfSatisfying(AuthFailure.class, erro -> assertThat(erro.status()).isEqualTo(403));
        }
        assertThat(contar("midia")).isZero();
        assertThat(contar("auditoria_midia")).isZero();
    }

    @Test
    void arquivoInvalidoExcessivoOuAusenteNuncaFicaPublicado() throws Exception {
        UUID id = UUID.randomUUID();
        assertThat(enviar(empresa, token, id, "<svg>falso</svg>".getBytes()).getStatus()).isEqualTo(422);
        assertThat(enviar(empresa, token, id, new byte[5 * 1024 * 1024 + 1]).getStatus()).isEqualTo(413);
        assertThat(mvc.perform(multipart(gestao(id)).header("Host", empresa.host())
                .header("Authorization", "Bearer " + token)).andReturn().getResponse().getStatus()).isEqualTo(400);
        assertThat(consultarPublica(empresa, id).getStatus()).isEqualTo(404);
        assertThat(contar("midia")).isZero();
        assertThat(contar("auditoria_midia")).isZero();
    }

    @Test
    void campoMultipartAdicionalERecusadoSemPublicacao() throws Exception {
        UUID id = UUID.randomUUID();
        var resposta = mvc.perform(multipart(gestao(id)).file(arquivo(imagem)).param("publicada", "false")
                .header("Host", empresa.host()).header("Authorization", "Bearer " + token))
                .andReturn().getResponse();

        assertThat(resposta.getStatus()).isEqualTo(400);
        assertThat(json(resposta).get("codigo").asText()).isEqualTo("ARQUIVO_INVALIDO");
        assertThat(consultarPublica(empresa, id).getStatus()).isEqualTo(404);
        assertThat(contar("midia")).isZero();
        assertThat(contar("auditoria_midia")).isZero();
    }

    @Test
    void jsonNoUploadRetornaTipoNaoSuportadoSemConsumirCota() throws Exception {
        UUID id = UUID.randomUUID();
        var resposta = mvc.perform(post(gestao(id)).contentType("application/json")
                .content("{\"arquivo\":\"imagem.png\"}")
                .header("Host", empresa.host()).header("Authorization", "Bearer " + token))
                .andReturn().getResponse();

        assertThat(resposta.getStatus()).isEqualTo(415);
        assertThat(consultarPublica(empresa, id).getStatus()).isEqualTo(404);
        assertThat(contar("midia")).isZero();
        assertThat(contar("auditoria_midia")).isZero();
        assertThat(valor("select quantidade from " + empresa.schema() + ".controle_midia")).isZero();
        assertThat(valor("select bytes from " + empresa.schema() + ".controle_midia")).isZero();
    }

    @Test
    void arquivosDuplicadosOuComOutroNomeSaoRecusadosSemEscolherOPrimeiro() throws Exception {
        for (String nome : List.of("arquivo", "imagemPrivada")) {
            UUID id = UUID.randomUUID();
            var extra = new MockMultipartFile(nome, "outra.png", "image/png", imagem(0xff123456));
            var resposta = mvc.perform(multipart(gestao(id)).file(arquivo(imagem)).file(extra)
                    .header("Host", empresa.host()).header("Authorization", "Bearer " + token))
                    .andReturn().getResponse();

            assertThat(resposta.getStatus()).isEqualTo(400);
            assertThat(consultarPublica(empresa, id).getStatus()).isEqualTo(404);
        }
        assertThat(contar("midia")).isZero();
        assertThat(contar("auditoria_midia")).isZero();
    }

    @Test
    void cotaDeQuantidadeEBytesNaoImpedeReplay() throws Exception {
        UUID id = UUID.randomUUID();
        assertThat(enviar(empresa, token, id, imagem).getStatus()).isEqualTo(201);
        executar("update " + empresa.schema() + ".controle_midia set quantidade=200");
        assertThat(enviar(empresa, token, UUID.randomUUID(), imagem).getStatus()).isEqualTo(422);
        assertThat(enviar(empresa, token, id, imagem).getStatus()).isEqualTo(200);
        executar("update " + empresa.schema() + ".controle_midia set quantidade=1, bytes=104857600");
        assertThat(enviar(empresa, token, UUID.randomUUID(), imagem).getStatus()).isEqualTo(422);
        assertThat(enviar(empresa, token, id, imagem).getStatus()).isEqualTo(200);
        assertThat(contar("midia")).isEqualTo(1);
    }

    @Test
    void enviosConcorrentesDaMesmaIntencaoPersistemUmaImagem() throws Exception {
        UUID id = UUID.randomUUID();
        var barreira = new CyclicBarrier(2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> {
                barreira.await(10, TimeUnit.SECONDS);
                return enviar(empresa, token, id, imagem).getStatus();
            });
            var segunda = executor.submit(() -> {
                barreira.await(10, TimeUnit.SECONDS);
                return enviar(empresa, token, id, imagem).getStatus();
            });
            assertThat(List.of(primeira.get(20, TimeUnit.SECONDS), segunda.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 201);
        }
        assertThat(contar("midia")).isEqualTo(1);
        assertThat(contar("auditoria_midia")).isEqualTo(1);
    }

    @Test
    void quotaSerializaIntencoesDiferentesConcorrentes() throws Exception {
        executar("update " + empresa.schema() + ".controle_midia set quantidade=199");
        var barreira = new CyclicBarrier(2);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeira = executor.submit(() -> {
                barreira.await(10, TimeUnit.SECONDS);
                return enviar(empresa, token, UUID.randomUUID(), imagem).getStatus();
            });
            var segunda = executor.submit(() -> {
                barreira.await(10, TimeUnit.SECONDS);
                return enviar(empresa, token, UUID.randomUUID(), imagem).getStatus();
            });
            assertThat(List.of(primeira.get(20, TimeUnit.SECONDS), segunda.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(201, 422);
        }
        assertThat(contar("midia")).isEqualTo(1);
        assertThat(valor("select quantidade from " + empresa.schema() + ".controle_midia")).isEqualTo(200);
    }

    @Test
    void falhaNaAuditoriaReverteImagemECotaEPermiteRetomada() throws Exception {
        UUID id = UUID.randomUUID();
        executar("alter table " + empresa.schema() + ".auditoria_midia add constraint falha_teste check (evento <> 'PUBLICACAO')");
        assertThat(enviar(empresa, token, id, imagem).getStatus()).isEqualTo(500);
        assertThat(contar("midia")).isZero();
        assertThat(valor("select quantidade from " + empresa.schema() + ".controle_midia")).isZero();
        assertThat(consultarPublica(empresa, id).getStatus()).isEqualTo(404);
        executar("alter table " + empresa.schema() + ".auditoria_midia drop constraint falha_teste");
        assertThat(enviar(empresa, token, id, imagem).getStatus()).isEqualTo(201);
        assertThat(contar("auditoria_midia")).isEqualTo(1);
    }

    private Empresa criarEmpresa() throws Exception {
        UUID id = UUID.randomUUID();
        var nova = new Empresa(id, "t_" + id.toString().replace("-", ""), "midia-" + id + ".localhost");
        empresas.add(nova);
        TestDatabase.migrate(nova.schema(), "tenant");
        executar("insert into public.empresa(id,nome,schema_name,estado) values ('" + id + "','Mídia fictícia','" + nova.schema() + "','ATIVO')");
        executar("insert into public.dominio(host,empresa_id) values ('" + nova.host() + "','" + id + "')");
        return nova;
    }

    private UUID criarUsuario(Empresa alvo, String perfil) throws Exception {
        UUID id = UUID.randomUUID();
        try (var connection = banco(); var statement = connection.prepareStatement("insert into " + alvo.schema()
                + ".usuario(id,email,senha_hash,perfil,email_verificado) values (?,?,?,?,true)")) {
            statement.setObject(1, id);
            statement.setString(2, id + "@example.invalid");
            statement.setString(3, HASH);
            statement.setString(4, perfil);
            statement.executeUpdate();
        }
        return id;
    }

    private String login(Empresa alvo, UUID usuario) throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf").header("Host", alvo.host())).andReturn().getResponse();
        var dados = json(csrf);
        var resposta = mvc.perform(post("/api/v1/auth/login").header("Host", alvo.host())
                .cookie(csrf.getCookie("__Host-RM_CSRF"))
                .header(dados.get("headerName").asText(), dados.get("token").asText())
                .contentType("application/json")
                .content(mapper.writeValueAsString(Map.of("email", usuario + "@example.invalid", "senha", SENHA))))
                .andReturn().getResponse();
        assertThat(resposta.getStatus()).isEqualTo(200);
        return json(resposta).get("accessToken").asText();
    }

    private MockHttpServletResponse enviar(Empresa alvo, String access, UUID id, byte[] bytes) throws Exception {
        return mvc.perform(multipart(gestao(id)).file(arquivo(bytes)).header("Host", alvo.host())
                .header("Authorization", "Bearer " + access)).andReturn().getResponse();
    }

    private MockHttpServletResponse consultar(Empresa alvo, String access, UUID id) throws Exception {
        return mvc.perform(get(gestao(id)).header("Host", alvo.host()).header("Authorization", "Bearer " + access))
                .andReturn().getResponse();
    }

    private MockHttpServletResponse consultarPublica(Empresa alvo, UUID id) throws Exception {
        return mvc.perform(get("/api/v1/midias/" + id).header("Host", alvo.host())).andReturn().getResponse();
    }

    private MockMultipartFile arquivo(byte[] bytes) {
        return new MockMultipartFile("arquivo", "../../imagem.html", "text/html", bytes);
    }

    private byte[] imagem(int cor) throws Exception {
        var buffer = new BufferedImage(16, 12, BufferedImage.TYPE_INT_RGB);
        buffer.setRGB(0, 0, cor);
        try (var saida = new ByteArrayOutputStream()) {
            ImageIO.write(buffer, "png", saida);
            return saida.toByteArray();
        }
    }

    private String gestao(UUID id) {
        return "/api/v1/gestao/midias/" + id;
    }

    private JsonNode json(MockHttpServletResponse resposta) throws Exception {
        return mapper.readTree(resposta.getContentAsString());
    }

    private Connection banco() throws Exception {
        var connection = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"),
                System.getenv("RM_MIGRATION_PASSWORD"));
        Migrations.verifyIdentity(connection, "rm_test", "rm_test_owner");
        return connection;
    }

    private void executar(String sql) throws Exception {
        try (var connection = banco(); var statement = connection.createStatement()) {
            statement.execute(sql);
        }
    }

    private long contar(String tabela) throws Exception {
        return valor("select count(*) from " + empresa.schema() + "." + tabela);
    }

    private long valor(String sql) throws Exception {
        try (var connection = banco(); var statement = connection.createStatement(); var result = statement.executeQuery(sql)) {
            result.next();
            return result.getLong(1);
        }
    }
}
