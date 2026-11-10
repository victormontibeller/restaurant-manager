package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import br.com.restaurantmanager.identidade.dtos.AcessosEfetivos;
import br.com.restaurantmanager.identidade.dtos.MatrizAcessos;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

/** Oráculo de docs/11_ACCESS_CONTROL.md; não deriva expectativas do enum ou dos seeds. */
@SpringBootTest
@AutoConfigureMockMvc
class Sprint05AcessosMatrizTest {
    private static final List<String> PERFIS = List.of(
            "ADMINISTRADOR", "GERENTE", "ATENDIMENTO", "CAIXA", "COZINHA", "EXPEDICAO");

    // As seis posições S/N seguem PERFIS. As ações agrupadas no documento são
    // explicitadas aqui pelos códigos do contrato, incluindo os incrementos S1/S4.
    private static final List<Linha> MATRIZ = """
            unidade.acompanhar             UNIDADE SSSSSS
            catalogo.consultar             UNIDADE SSSSSS
            catalogo.editar                EMPRESA SSNNNN
            catalogo.alterar_unidade        UNIDADE SSNNNN
            pedido.consultar               UNIDADE SSSSSS
            pedido.criar_assistido          UNIDADE SSSNNN
            pedido.aceitar                  UNIDADE SSSNNN
            pedido.recusar                  UNIDADE SSSNNN
            cozinha.iniciar                UNIDADE SSNNSN
            cozinha.concluir               UNIDADE SSNNSN
            pedido.servir                  UNIDADE SSSNNS
            pedido.retirar                 UNIDADE SSNNNS
            pedido.despachar               UNIDADE SSNNNS
            pedido.entregar                UNIDADE SSNNNS
            entrega.registrar_ocorrencia    UNIDADE SSNNNS
            entrega.decidir_ocorrencia      UNIDADE SSNNNN
            pedido.cancelar_antes_preparo   UNIDADE SSSNNN
            pedido.cancelar_apos_preparo    UNIDADE SSNNNN
            mesa.atender                   UNIDADE SSSNNN
            comanda.iniciar_fechamento      UNIDADE SSNSNN
            comanda.reabrir                 UNIDADE SSNSNN
            recebimento.registrar          UNIDADE SSNSNN
            comanda.concluir                UNIDADE SSNSNN
            financeiro.ajustar              UNIDADE SSNNNN
            devolucao.solicitar             UNIDADE SSNNNN
            pagamento.reconciliar          UNIDADE SSNNNN
            relatorio.consultar            UNIDADE SSNSNN
            auditoria.consultar            EMPRESA SSNNNN
            """.lines().map(String::strip).filter(line -> !line.isEmpty()).map(line -> {
                String[] fields = line.split("\\s+");
                return new Linha(fields[0], fields[1], fields[2]);
            }).toList();

    private record Linha(String codigo, String escopo, String permissoes) {
        boolean permite(String perfil) {
            return permissoes.charAt(PERFIS.indexOf(perfil)) == 'S';
        }
    }

    private record Empresa(UUID id, String schema, String host) {}
    private record SessaoTeste(String token, IdentidadeAtual identidade) {}

    @Autowired
    MockMvc mvc;
    @Autowired
    ObjectMapper mapper;
    @Autowired
    AcessosService acessos;
    @Autowired
    PlatformTransactionManager transactions;
    private final List<Empresa> empresas = new ArrayList<>();
    private final Map<String, UUID> usuarios = new LinkedHashMap<>();
    private final Map<String, SessaoTeste> sessoes = new LinkedHashMap<>();
    private final UUID unidadePermitida = UUID.randomUUID();
    private final UUID unidadeNaoAtribuida = UUID.randomUUID();
    private final String senha = UUID.randomUUID().toString();
    private final String senhaHash = new BCryptPasswordEncoder(12).encode(senha);
    private Empresa empresa;
    private UUID operador;

    @BeforeAll
    static void prepararBancoReal() throws Exception {
        TestDatabase.prepare();
    }

    private Connection banco() throws Exception {
        var connection = DriverManager.getConnection(System.getenv("RM_DB_URL"),
                System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
        Migrations.verifyIdentity(connection, "rm_test", "rm_test_owner");
        return connection;
    }

    @BeforeEach
    void criarFixtureExclusiva() throws Exception {
        empresa = criarEmpresa();
        for (String perfil : PERFIS) {
            criarUsuario(empresa, perfil, UUID.randomUUID());
        }
        criarUsuario(empresa, "CLIENTE", UUID.randomUUID());
    }

    private Empresa criarEmpresa() throws Exception {
        UUID id = UUID.randomUUID();
        var criada = new Empresa(id, "t_" + id.toString().replace("-", ""), "matriz-s05-" + id + ".localhost");
        empresas.add(criada);
        TestDatabase.migrate(criada.schema(), "tenant");
        try (var connection = banco(); var statement = connection.createStatement()) {
            statement.execute("insert into public.empresa(id,nome,schema_name,estado) values ('" + id
                    + "','Matriz fictícia Sprint 5','" + criada.schema() + "','ATIVO')");
            statement.execute("insert into public.dominio(host,empresa_id) values ('" + criada.host() + "','" + id + "')");
            statement.execute("insert into " + criada.schema() + ".unidade(id,nome) values ('"
                    + unidadePermitida + "','Permitida'),('" + unidadeNaoAtribuida + "','Não atribuída')");
        }
        return criada;
    }

    private void criarUsuario(Empresa alvo, String perfil, UUID id) throws Exception {
        try (var connection = banco(); var statement = connection.prepareStatement("insert into " + alvo.schema()
                + ".usuario(id,email,senha_hash,perfil,email_verificado) values (?,?,?,?,true)")) {
            statement.setObject(1, id);
            statement.setString(2, id + "@example.invalid");
            statement.setString(3, senhaHash);
            statement.setString(4, perfil);
            statement.executeUpdate();
            if (!perfil.equals("ADMINISTRADOR") && !perfil.equals("CLIENTE")) {
                try (var vinculo = connection.prepareStatement("insert into " + alvo.schema()
                        + ".usuario_unidade(usuario_id,unidade_id) values (?,?)")) {
                    vinculo.setObject(1, id);
                    vinculo.setObject(2, unidadePermitida);
                    vinculo.executeUpdate();
                }
            }
        }
        if (alvo.equals(empresa)) {
            usuarios.put(perfil, id);
        }
    }

    private String login(UUID usuario, String host, boolean plataforma) throws Exception {
        String base = plataforma ? "/api/v1/plataforma/auth/" : "/api/v1/auth/";
        var csrf = mvc.perform(get(base + "csrf").header("Host", host)).andReturn().getResponse();
        assertThat(csrf.getStatus()).isEqualTo(200);
        var fields = mapper.readTree(csrf.getContentAsString());
        String cookie = plataforma ? "__Host-RM_PLATFORM_CSRF" : "__Host-RM_CSRF";
        var result = mvc.perform(post(base + "login").header("Host", host).cookie(csrf.getCookie(cookie))
                .header(fields.get("headerName").asText(), fields.get("token").asText())
                .with(request -> {
                    request.setRemoteAddr("2001:db8:" + usuario.toString().substring(0, 4) + ":"
                            + usuario.toString().substring(4, 8) + "::1");
                    return request;
                })
                .contentType("application/json").content(mapper.writeValueAsString(
                        Map.of("email", usuario + "@example.invalid", "senha", senha))))
                .andReturn().getResponse();
        assertThat(result.getStatus()).isEqualTo(200);
        return mapper.readTree(result.getContentAsString()).get("accessToken").asText();
    }

    private SessaoTeste sessao(String perfil) throws Exception {
        if (!sessoes.containsKey(perfil)) {
            String token = login(usuarios.get(perfil), empresa.host(), false);
            var response = consultar(token, empresa.host(), "/api/v1/auth/me").getResponse();
            assertThat(response.getStatus()).isEqualTo(200);
            sessoes.put(perfil, new SessaoTeste(token, mapper.readValue(response.getContentAsString(), IdentidadeAtual.class)));
        }
        return sessoes.get(perfil);
    }

    private MvcResult consultar(String token, String host, String path) throws Exception {
        return mvc.perform(get(path).header("Host", host).header("Authorization", "Bearer " + token)).andReturn();
    }

    private List<String> esperadas(String perfil) {
        return MATRIZ.stream().filter(row -> row.permite(perfil)).map(Linha::codigo).toList();
    }

    private int autorizar(Empresa alvo, IdentidadeAtual ator, Linha linha, UUID unidade) {
        try (var scope = TenantScope.open(alvo.schema())) {
            new TransactionTemplate(transactions).executeWithoutResult(status ->
                    acessos.autorizar(ator, Acao.obter(linha.codigo()), unidade));
            return 200;
        } catch (AuthFailure failure) {
            return failure.status();
        }
    }

    @Test
    void apiExpoeExatamenteAs28AcoesESeisPerfisDaMatrizCanonica() throws Exception {
        assertThat(MATRIZ).hasSize(28);
        assertThat(MATRIZ.stream().map(Linha::codigo).toList()).doesNotHaveDuplicates();
        for (Linha linha : MATRIZ) {
            assertThat(linha.permissoes()).matches("[SN]{6}");
        }
        var response = consultar(sessao("ADMINISTRADOR").token(), empresa.host(), "/api/v1/configuracoes/acessos").getResponse();
        assertThat(response.getStatus()).isEqualTo(200);
        var matriz = mapper.readValue(response.getContentAsString(), MatrizAcessos.class);
        assertThat(matriz.versao()).isZero();
        assertThat(matriz.acoes().stream().map(acao -> acao.codigo()).toList())
                .containsExactlyInAnyOrderElementsOf(MATRIZ.stream().map(Linha::codigo).toList());
        assertThat(matriz.perfis().keySet()).containsExactlyInAnyOrderElementsOf(PERFIS.subList(1, 6));
        for (Linha linha : MATRIZ) {
            assertThat(matriz.acoes().stream().filter(acao -> acao.codigo().equals(linha.codigo()))
                    .map(acao -> acao.escopo()).toList()).as(linha.codigo()).containsExactly(linha.escopo());
        }
        for (String perfil : PERFIS) {
            if (!perfil.equals("ADMINISTRADOR")) {
                assertThat(matriz.perfis().get(perfil)).as("Seed %s", perfil)
                        .containsExactlyInAnyOrderElementsOf(esperadas(perfil));
            }
            var efetivo = consultar(sessao(perfil).token(), empresa.host(), "/api/v1/acessos/efetivos").getResponse();
            assertThat(efetivo.getStatus()).as(perfil).isEqualTo(200);
            var acesso = mapper.readValue(efetivo.getContentAsString(), AcessosEfetivos.class);
            assertThat(acesso.perfil()).isEqualTo(perfil);
            assertThat(acesso.acoes()).as("Ações efetivas de %s", perfil)
                    .containsExactlyInAnyOrderElementsOf(esperadas(perfil));
            var unidades = acesso.unidades().stream().map(unidade -> unidade.id()).toList();
            assertThat(unidades).containsExactlyInAnyOrderElementsOf(perfil.equals("ADMINISTRADOR")
                    ? List.of(unidadePermitida, unidadeNaoAtribuida) : List.of(unidadePermitida));
            assertThat(consultar(sessao(perfil).token(), empresa.host(), "/api/v1/configuracoes/acessos")
                    .getResponse().getStatus()).isEqualTo(perfil.equals("ADMINISTRADOR") ? 200 : 403);
        }
    }

    @Test
    void politicaRealConfere168CelulasESubmetePermissoesAUnidade() throws Exception {
        int celulas = 0;
        for (String perfil : PERFIS) {
            IdentidadeAtual ator = sessao(perfil).identidade();
            for (Linha linha : MATRIZ) {
                boolean permitida = linha.permite(perfil);
                UUID unidade = linha.escopo().equals("UNIDADE") ? unidadePermitida : null;
                assertThat(autorizar(empresa, ator, linha, unidade)).as("%s / %s", perfil, linha.codigo())
                        .isEqualTo(permitida ? 200 : 403);
                celulas++;
                if (linha.escopo().equals("UNIDADE")) {
                    assertThat(autorizar(empresa, ator, linha, unidadeNaoAtribuida))
                            .as("Unidade não atribuída: %s / %s", perfil, linha.codigo())
                            .isEqualTo(perfil.equals("ADMINISTRADOR") ? 200 : permitida ? 404 : 403);
                    assertThat(autorizar(empresa, ator, linha, null))
                            .as("Unidade ausente: %s / %s", perfil, linha.codigo()).isEqualTo(permitida ? 404 : 403);
                } else {
                    assertThat(autorizar(empresa, ator, linha, unidadePermitida))
                            .as("Escopo empresarial: %s / %s", perfil, linha.codigo()).isEqualTo(permitida ? 400 : 403);
                }
            }
        }
        assertThat(celulas).isEqualTo(168);
    }

    @Test
    void clienteOutroTenantEOperadorSaasNaoHerdamMatrizDeFuncionarios() throws Exception {
        var cliente = sessao("CLIENTE");
        assertThat(consultar(cliente.token(), empresa.host(), "/api/v1/acessos/efetivos").getResponse().getStatus()).isEqualTo(403);
        for (Linha linha : MATRIZ) {
            assertThat(autorizar(empresa, cliente.identidade(), linha,
                    linha.escopo().equals("UNIDADE") ? unidadePermitida : null)).as(linha.codigo()).isEqualTo(403);
        }
        Empresa outra = criarEmpresa();
        // Mesmo UUID de usuário/unidade não cria vínculo entre empresas.
        criarUsuario(outra, "ADMINISTRADOR", usuarios.get("ADMINISTRADOR"));
        String outroToken = login(usuarios.get("ADMINISTRADOR"), outra.host(), false);
        assertThat(consultar(outroToken, outra.host(), "/api/v1/acessos/efetivos").getResponse().getStatus()).isEqualTo(200);
        for (String perfil : PERFIS) {
            var atual = sessao(perfil);
            assertThat(consultar(atual.token(), outra.host(), "/api/v1/acessos/efetivos").getResponse().getStatus()).isEqualTo(401);
            for (Linha linha : MATRIZ) {
                assertThat(autorizar(outra, atual.identidade(), linha,
                        linha.escopo().equals("UNIDADE") ? unidadePermitida : null))
                        .as("Tenant alheio: %s / %s", perfil, linha.codigo()).isEqualTo(401);
            }
        }
        operador = UUID.randomUUID();
        try (var connection = banco(); var statement = connection.prepareStatement(
                "insert into public.usuario_plataforma(id,email,senha_hash) values (?,?,?)")) {
            statement.setObject(1, operador);
            statement.setString(2, operador + "@example.invalid");
            statement.setString(3, senhaHash);
            statement.executeUpdate();
        }
        String tokenSaas = login(operador, "plataforma.localhost", true);
        assertThat(consultar(tokenSaas, "plataforma.localhost", "/api/v1/plataforma/auth/me").getResponse().getStatus()).isEqualTo(200);
        assertThat(consultar(tokenSaas, empresa.host(), "/api/v1/acessos/efetivos").getResponse().getStatus()).isEqualTo(401);
        assertThat(consultar(sessao("ADMINISTRADOR").token(), "plataforma.localhost", "/api/v1/plataforma/auth/me")
                .getResponse().getStatus()).isEqualTo(401);
    }

    @AfterEach
    void removerSomenteFixturesProprias() throws Exception {
        try (var connection = banco(); var statement = connection.createStatement()) {
            if (operador != null) {
                statement.execute("delete from public.auditoria_plataforma where usuario_id='" + operador + "'");
                statement.execute("delete from public.sessao_plataforma where usuario_id='" + operador + "'");
                statement.execute("delete from public.usuario_plataforma where id='" + operador + "'");
            }
            for (Empresa criada : empresas) {
                statement.execute("delete from public.dominio where empresa_id='" + criada.id() + "'");
                statement.execute("delete from public.empresa where id='" + criada.id() + "'");
                statement.execute("drop schema if exists " + criada.schema() + " cascade");
            }
        }
    }
}
