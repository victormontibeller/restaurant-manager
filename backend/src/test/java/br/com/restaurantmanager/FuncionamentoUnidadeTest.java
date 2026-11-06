package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import br.com.restaurantmanager.tenancy.Migrations;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class FuncionamentoUnidadeTest {
    private static final UUID UNIDADE = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID OUTRA_UNIDADE = UUID.fromString("22222222-2222-2222-2222-222222222222");
    private static final String SENHA = UUID.randomUUID().toString();
    private static final String HASH = new BCryptPasswordEncoder(12).encode(SENHA);

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    private final List<Empresa> empresas = new ArrayList<>();
    private Empresa empresa;
    private UUID administrador;
    private String token;

    private record Empresa(UUID id, String schema, String host) {}

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void prepararMassaPropria() throws Exception {
        empresa = criarEmpresa("A");
        administrador = criarUsuario(empresa, "ADMINISTRADOR");
        token = login(empresa, administrador);
    }

    @AfterEach
    void limparSomenteMassaPropria() throws Exception {
        for (var criada : empresas) {
            try (var connection = banco(); var statement = connection.createStatement()) {
                statement.execute("delete from public.dominio where empresa_id='" + criada.id() + "'");
                statement.execute("delete from public.empresa where id='" + criada.id() + "'");
                statement.execute("drop schema if exists " + criada.schema() + " cascade");
            }
        }
    }

    @Test
    void configuracaoAusenteFicaFechadaESemDadosPrivados() throws Exception {
        var administrativo = consultar(empresa, token, UNIDADE);
        assertThat(administrativo.getStatus()).isEqualTo(200);
        var detalhe = json(administrativo);
        assertThat(detalhe.get("versao").asLong()).isZero();
        assertThat(detalhe.get("versaoUnidade").asLong()).isZero();
        assertThat(detalhe.get("fuso").asText()).isEqualTo("America/Sao_Paulo");
        assertThat(detalhe.get("canais").size()).isZero();
        assertThat(detalhe.get("horarios").size()).isZero();

        var publico = consultarPublico(empresa, UNIDADE);
        assertThat(publico.getStatus()).isEqualTo(200);
        var resumo = json(publico);
        assertThat(resumo.get("nome").asText()).isEqualTo("A1");
        assertThat(resumo.get("fuso").asText()).isEqualTo("America/Sao_Paulo");
        assertThat(resumo.get("consultadoEm").asText()).isNotBlank();
        assertThat(resumo.get("canais").size()).isEqualTo(3);
        for (var canal : resumo.get("canais")) {
            assertThat(canal.get("habilitado").asBoolean()).isFalse();
            assertThat(canal.get("aberto").asBoolean()).isFalse();
        }
        assertThat(publico.getContentAsString()).doesNotContain("versao", "schema", "senha", "email", "ator", "token");
        assertThat(consultarPublico(empresa, UUID.randomUUID()).getStatus()).isEqualTo(404);
        assertThat(mvc.perform(get(publico(UNIDADE)).header("Host", "inexistente.localhost"))
                .andReturn().getResponse().getStatus()).isEqualTo(404);
        assertThat(mvc.perform(get(administrativo(UNIDADE)).header("Host", empresa.host()))
                .andReturn().getResponse().getStatus()).isEqualTo(401);
    }

    @Test
    void canaisHabilitadosSemHorarioPermanecemFechadosEHorariosDesabilitadosSaoPreservados() throws Exception {
        reautenticar(empresa, token);
        var horarios = new ArrayList<Map<String, Object>>();
        for (int dia = 1; dia <= 7; dia++) {
            horarios.add(horario("DELIVERY", dia, "00:00", "24:00"));
            horarios.add(horario("MESA", dia, "00:00", "24:00"));
        }
        var gravado = alterar(empresa, token, UNIDADE,
                corpo(0, List.of("RETIRADA", "DELIVERY"), horarios));
        assertThat(gravado.getStatus()).isEqualTo(200);
        assertThat(json(gravado).get("versao").asLong()).isEqualTo(1);

        var resumo = json(consultarPublico(empresa, UNIDADE));
        assertThat(canal(resumo, "DELIVERY").get("aberto").asBoolean()).isTrue();
        assertThat(canal(resumo, "RETIRADA").get("habilitado").asBoolean()).isTrue();
        assertThat(canal(resumo, "RETIRADA").get("aberto").asBoolean()).isFalse();
        assertThat(canal(resumo, "MESA").get("habilitado").asBoolean()).isFalse();
        assertThat(canal(resumo, "MESA").get("aberto").asBoolean()).isFalse();
        assertThat(resumo.get("horarios").size()).isEqualTo(14);
        assertThat(json(consultarPublico(empresa, OUTRA_UNIDADE)).get("horarios").size()).isZero();
    }

    @Test
    void mesmaConfiguracaoNaoAvancaVersaoNemAuditoriaECadastroDaUnidadeNaoMuda() throws Exception {
        reautenticar(empresa, token);
        assertThat(alterar(empresa, token, UNIDADE, corpo(0, List.of(), List.of())).getStatus()).isEqualTo(200);
        assertThat(contar("funcionamento_unidade")).isZero();
        assertThat(contar("auditoria_acesso")).isZero();

        var primeira = horario("DELIVERY", 2, "18:00", "02:00");
        var segunda = horario("DELIVERY", 1, "10:00", "12:00");
        var primeiraResposta = alterar(empresa, token, UNIDADE,
                corpo(0, List.of("MESA", "DELIVERY"), List.of(primeira, segunda)));
        assertThat(primeiraResposta.getStatus()).isEqualTo(200);
        var repetida = alterar(empresa, token, UNIDADE,
                corpo(1, List.of("DELIVERY", "MESA"), List.of(segunda, primeira)));
        assertThat(repetida.getStatus()).isEqualTo(200);
        assertThat(json(repetida).get("versao").asLong()).isEqualTo(1);
        assertThat(contar("auditoria_acesso")).isEqualTo(1);
        assertThat(contar("evento_unidade")).isZero();
        try (var connection = banco(); var statement = connection.createStatement();
                var result = statement.executeQuery("select versao from " + empresa.schema() + ".unidade where id='" + UNIDADE + "'")) {
            result.next();
            assertThat(result.getLong(1)).isZero();
        }
        try (var connection = banco(); var statement = connection.createStatement();
                var result = statement.executeQuery("select evento, antes, depois from " + empresa.schema() + ".auditoria_acesso")) {
            result.next();
            assertThat(result.getString(1)).isEqualTo("FUNCIONAMENTO_UNIDADE_ALTERADO");
            assertThat(result.getString(2)).isNotEqualTo(result.getString(3));
        }
        assertThat(alterar(empresa, token, UNIDADE, corpo(0, List.of(), List.of())).getStatus()).isEqualTo(409);
    }

    @Test
    void somenteAdministradorAtualEReautenticadoPodeEditar() throws Exception {
        var body = corpo(0, List.of("DELIVERY"), List.of());
        var semConfirmacao = alterar(empresa, token, UNIDADE, body);
        assertThat(semConfirmacao.getStatus()).isEqualTo(403);
        assertThat(json(semConfirmacao).get("codigo").asText()).isEqualTo("REAUTENTICACAO_NECESSARIA");

        for (String perfil : List.of("GERENTE", "ATENDIMENTO", "CAIXA", "COZINHA", "EXPEDICAO", "CLIENTE")) {
            String outro = login(empresa, criarUsuario(empresa, perfil));
            assertThat(consultar(empresa, outro, UNIDADE).getStatus()).isEqualTo(403);
            assertThat(alterar(empresa, outro, UNIDADE, body).getStatus()).isEqualTo(403);
        }
        reautenticar(empresa, token);
        assertThat(alterar(empresa, token, UNIDADE, body).getStatus()).isEqualTo(200);

        executar("update " + empresa.schema() + ".sessao set reautenticada_em=now()-interval '6 minutes'");
        assertThat(alterar(empresa, token, UNIDADE, corpo(1, List.of(), List.of())).getStatus()).isEqualTo(403);
        executar("update " + empresa.schema() + ".sessao set revogada_em=now()");
        assertThat(consultar(empresa, token, UNIDADE).getStatus()).isEqualTo(401);
        assertThat(alterar(empresa, token, UNIDADE, corpo(1, List.of(), List.of())).getStatus()).isEqualTo(401);
        assertThat(contar("auditoria_acesso")).isEqualTo(1);
    }

    @Test
    void inativacaoOcultaFuncionamentoPublicoEPreservaConfiguracaoAdministrativa() throws Exception {
        reautenticar(empresa, token);
        assertThat(alterar(empresa, token, UNIDADE, corpo(0, List.of("MESA"), List.of())).getStatus()).isEqualTo(200);
        executar("update " + empresa.schema() + ".unidade set ativa=false where id='" + UNIDADE + "'");

        assertThat(consultarPublico(empresa, UNIDADE).getStatus()).isEqualTo(404);
        assertThat(consultar(empresa, token, UNIDADE).getStatus()).isEqualTo(200);
        assertThat(json(consultar(empresa, token, UNIDADE)).get("versao").asLong()).isEqualTo(1);
        executar("update " + empresa.schema() + ".unidade set ativa=true where id='" + UNIDADE + "'");
        assertThat(canal(json(consultarPublico(empresa, UNIDADE)), "MESA").get("habilitado").asBoolean()).isTrue();
    }

    @Test
    void alteracaoDeFusoOuAtividadeExigeReconsultaAntesDeSalvarHorarios() throws Exception {
        reautenticar(empresa, token);
        var horarios = List.of(horario("DELIVERY", 1, "18:00", "02:00"));
        assertThat(alterar(empresa, token, UNIDADE, corpo(0, List.of("DELIVERY"), horarios)).getStatus()).isEqualTo(200);

        var fusoAlterado = mvc.perform(put("/api/v1/configuracoes/unidades/" + UNIDADE)
                .header("Host", empresa.host()).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(mapper.writeValueAsString(Map.of(
                        "versao", 0, "nome", "A1", "fuso", "America/Manaus", "ativa", true))))
                .andReturn().getResponse();
        assertThat(fusoAlterado.getStatus()).isEqualTo(200);
        assertThat(alterar(empresa, token, UNIDADE, corpo(1, List.of(), List.of())).getStatus()).isEqualTo(409);
        assertThat(alterar(empresa, token, UNIDADE, corpo(1, List.of("DELIVERY"), horarios)).getStatus()).isEqualTo(409);
        assertThat(contar("auditoria_acesso")).isEqualTo(2);
        assertThat(contar("horario_unidade")).isEqualTo(1);

        var atualizado = json(consultar(empresa, token, UNIDADE));
        assertThat(atualizado.get("versao").asLong()).isEqualTo(1);
        assertThat(atualizado.get("versaoUnidade").asLong()).isEqualTo(1);
        assertThat(atualizado.get("fuso").asText()).isEqualTo("America/Manaus");
        assertThat(alterar(empresa, token, UNIDADE, corpo(1, 1, List.of("MESA"), horarios)).getStatus()).isEqualTo(200);

        var inativada = mvc.perform(put("/api/v1/configuracoes/unidades/" + UNIDADE)
                .header("Host", empresa.host()).header("Authorization", "Bearer " + token)
                .contentType("application/json").content(mapper.writeValueAsString(Map.of(
                        "versao", 1, "nome", "A1", "fuso", "America/Manaus", "ativa", false))))
                .andReturn().getResponse();
        assertThat(inativada.getStatus()).isEqualTo(200);
        assertThat(alterar(empresa, token, UNIDADE, corpo(2, 1, List.of(), List.of())).getStatus()).isEqualTo(409);
        assertThat(contar("auditoria_acesso")).isEqualTo(4);
        assertThat(contar("horario_unidade")).isEqualTo(1);
        var aposInativacao = json(consultar(empresa, token, UNIDADE));
        assertThat(aposInativacao.get("versao").asLong()).isEqualTo(2);
        assertThat(aposInativacao.get("versaoUnidade").asLong()).isEqualTo(2);
        assertThat(consultarPublico(empresa, UNIDADE).getStatus()).isEqualTo(404);
    }

    @Test
    void entradasInvalidasNaoAlteramConfiguracaoNemAuditoria() throws Exception {
        reautenticar(empresa, token);
        var excessivos = IntStream.range(0, 85).mapToObj(i -> horario("MESA", 1, "10:00", "12:00")).toList();
        var invalidos = List.of(
                corpo(0, List.of("DELIVERY", "DELIVERY"), List.of()),
                corpo(0, List.of("BALCAO"), List.of()),
                corpo(-1, List.of(), List.of()),
                corpo(0, List.of(), List.of(horario("DELIVERY", 0, "10:00", "12:00"))),
                corpo(0, List.of(), List.of(horario("DELIVERY", 8, "10:00", "12:00"))),
                corpo(0, List.of(), List.of(horario("DELIVERY", 1, "24:00", "12:00"))),
                corpo(0, List.of(), List.of(horario("DELIVERY", 1, "10:00", "24:01"))),
                corpo(0, List.of(), excessivos));
        for (var body : invalidos) {
            assertThat(alterar(empresa, token, UNIDADE, body).getStatus()).isEqualTo(400);
        }
        for (var body : List.of(
                corpo(0, List.of(), List.of(horario("DELIVERY", 1, "10:00", "10:00"))),
                corpo(0, List.of(), List.of(horario("DELIVERY", 7, "22:00", "02:00"),
                        horario("DELIVERY", 1, "01:00", "03:00"))))) {
            assertThat(alterar(empresa, token, UNIDADE, body).getStatus()).isEqualTo(422);
        }
        for (String payload : List.of(
                "{\"versao\":0,\"versaoUnidade\":0,\"canais\":[0],\"horarios\":[]}",
                "{\"versao\":0.5,\"versaoUnidade\":0,\"canais\":[],\"horarios\":[]}",
                "{\"versao\":0,\"versaoUnidade\":0.5,\"canais\":[],\"horarios\":[]}",
                "{\"versao\":0,\"versaoUnidade\":-1,\"canais\":[],\"horarios\":[]}",
                "{\"versao\":0,\"versaoUnidade\":0,\"canais\":[],\"horarios\":[{\"canal\":\"MESA\",\"diaSemana\":1.5,\"inicio\":\"10:00\",\"fim\":\"12:00\"}]}",
                "{\"versao\":0,\"versaoUnidade\":0,\"canais\":[],\"horarios\":[],\"schema\":\"public\"}",
                "{\"versaoUnidade\":0,\"canais\":[],\"horarios\":[]}",
                "{\"versao\":0,\"canais\":[],\"horarios\":[]}",
                "{\"versao\":0,\"versaoUnidade\":0,\"canais\":null,\"horarios\":[]}",
                "{\"versao\":0,\"versaoUnidade\":0,\"canais\":[],\"horarios\":[null]}")) {
            assertThat(alterarJson(empresa, token, UNIDADE, payload).getStatus()).isEqualTo(400);
        }
        assertThat(contar("funcionamento_unidade")).isZero();
        assertThat(contar("horario_unidade")).isZero();
        assertThat(contar("auditoria_acesso")).isZero();
    }

    @Test
    void tenantsComMesmoIdDeUnidadeMantemConfiguracoesIsoladas() throws Exception {
        var outra = criarEmpresa("B");
        UUID outroAdministrador = criarUsuario(outra, "ADMINISTRADOR");
        String outroToken = login(outra, outroAdministrador);
        reautenticar(empresa, token);
        reautenticar(outra, outroToken);

        assertThat(alterar(empresa, token, UNIDADE, corpo(0, List.of("DELIVERY"), List.of())).getStatus()).isEqualTo(200);
        assertThat(alterar(outra, outroToken, UNIDADE, corpo(0, List.of("MESA"), List.of())).getStatus()).isEqualTo(200);
        assertThat(alterar(outra, token, UNIDADE, corpo(1, List.of(), List.of())).getStatus()).isEqualTo(401);
        assertThat(consultar(empresa, outroToken, UNIDADE).getStatus()).isEqualTo(401);

        var primeira = json(consultarPublico(empresa, UNIDADE));
        var segunda = json(consultarPublico(outra, UNIDADE));
        assertThat(primeira.get("nome").asText()).isEqualTo("A1");
        assertThat(segunda.get("nome").asText()).isEqualTo("B1");
        assertThat(canal(primeira, "DELIVERY").get("habilitado").asBoolean()).isTrue();
        assertThat(canal(primeira, "MESA").get("habilitado").asBoolean()).isFalse();
        assertThat(canal(segunda, "MESA").get("habilitado").asBoolean()).isTrue();
        assertThat(canal(segunda, "DELIVERY").get("habilitado").asBoolean()).isFalse();
    }

    @Test
    void edicoesConcorrentesDaMesmaVersaoTemUmVencedor() throws Exception {
        reautenticar(empresa, token);
        var inicio = new CyclicBarrier(2);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var primeira = pool.submit(() -> {
                inicio.await(10, TimeUnit.SECONDS);
                return alterar(empresa, token, UNIDADE,
                        corpo(0, List.of("DELIVERY"), List.of(horario("DELIVERY", 1, "10:00", "12:00")))).getStatus();
            });
            var segunda = pool.submit(() -> {
                inicio.await(10, TimeUnit.SECONDS);
                return alterar(empresa, token, UNIDADE,
                        corpo(0, List.of("MESA"), List.of(horario("MESA", 7, "18:00", "02:00")))).getStatus();
            });
            assertThat(List.of(primeira.get(30, TimeUnit.SECONDS), segunda.get(30, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        }
        var resultado = json(consultar(empresa, token, UNIDADE));
        assertThat(resultado.get("versao").asLong()).isEqualTo(1);
        assertThat(resultado.get("canais").size()).isEqualTo(1);
        assertThat(resultado.get("horarios").size()).isEqualTo(1);
        assertThat(resultado.get("canais").get(0).asText())
                .isEqualTo(resultado.get("horarios").get(0).get("canal").asText());
        assertThat(contar("auditoria_acesso")).isEqualTo(1);
    }

    @Test
    void revalidaAdministradorDepoisDeEsperarLockDaPolitica() throws Exception {
        reautenticar(empresa, token);
        try (var connection = banco(); var pool = Executors.newSingleThreadExecutor()) {
            connection.setAutoCommit(false);
            try (var statement = connection.createStatement()) {
                statement.execute("select id from " + empresa.schema() + ".politica_acesso where id=1 for update");
            }
            var iniciou = new CountDownLatch(1);
            var escrita = pool.submit(() -> {
                iniciou.countDown();
                return alterar(empresa, token, UNIDADE, corpo(0, List.of("MESA"), List.of())).getStatus();
            });
            try {
                assertThat(iniciou.await(5, TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> escrita.get(1, TimeUnit.SECONDS)).isInstanceOf(TimeoutException.class);
                try (var statement = connection.createStatement()) {
                    statement.execute("update " + empresa.schema() + ".usuario set perfil='GERENTE' where id='" + administrador + "'");
                }
            } finally {
                connection.commit();
            }
            assertThat(escrita.get(20, TimeUnit.SECONDS)).isEqualTo(403);
        }
        assertThat(contar("funcionamento_unidade")).isZero();
        assertThat(contar("auditoria_acesso")).isZero();
    }

    @Test
    void falhaNaAuditoriaReverteConfiguracaoEHorariosAtomicamente() throws Exception {
        reautenticar(empresa, token);
        executar("alter table " + empresa.schema() + ".auditoria_acesso add constraint teste_falha_funcionamento "
                + "check(evento <> 'FUNCIONAMENTO_UNIDADE_ALTERADO')");
        var resposta = alterar(empresa, token, UNIDADE,
                corpo(0, List.of("DELIVERY"), List.of(horario("DELIVERY", 1, "10:00", "12:00"))));

        assertThat(resposta.getStatus()).isEqualTo(500);
        assertThat(contar("funcionamento_unidade")).isZero();
        assertThat(contar("horario_unidade")).isZero();
        assertThat(contar("auditoria_acesso")).isZero();
        assertThat(json(consultar(empresa, token, UNIDADE)).get("versao").asLong()).isZero();
    }

    @Test
    void leituraPublicaNaoMisturaCadastroCanaisEHorariosAntesDoCommit() throws Exception {
        reautenticar(empresa, token);
        assertThat(alterar(empresa, token, UNIDADE,
                corpo(0, List.of("DELIVERY"), List.of(horario("DELIVERY", 1, "10:00", "12:00")))).getStatus()).isEqualTo(200);

        try (var connection = banco()) {
            connection.setAutoCommit(false);
            try (var statement = connection.createStatement()) {
                statement.execute("update " + empresa.schema() + ".unidade set nome='Novo nome' where id='" + UNIDADE + "'");
                statement.execute("update " + empresa.schema() + ".funcionamento_unidade set delivery=false, mesa=true, versao=2 where unidade_id='" + UNIDADE + "'");
                statement.execute("delete from " + empresa.schema() + ".horario_unidade where unidade_id='" + UNIDADE + "'");
                statement.execute("insert into " + empresa.schema() + ".horario_unidade values ('" + UNIDADE + "','MESA',2,1080,1560)");
            }
            var antes = json(consultarPublico(empresa, UNIDADE));
            assertThat(antes.get("nome").asText()).isEqualTo("A1");
            assertThat(canal(antes, "DELIVERY").get("habilitado").asBoolean()).isTrue();
            assertThat(antes.get("horarios").get(0).get("canal").asText()).isEqualTo("DELIVERY");
            connection.commit();
        }
        var depois = json(consultarPublico(empresa, UNIDADE));
        assertThat(depois.get("nome").asText()).isEqualTo("Novo nome");
        assertThat(canal(depois, "DELIVERY").get("habilitado").asBoolean()).isFalse();
        assertThat(canal(depois, "MESA").get("habilitado").asBoolean()).isTrue();
        assertThat(depois.get("horarios").get(0).get("canal").asText()).isEqualTo("MESA");
        assertThat(depois.get("horarios").get(0).get("fim").asText()).isEqualTo("02:00");
    }

    @Test
    void bancoImpedeOrfaosIntervalosInvalidosEDuplicacao() throws Exception {
        String configuracao = empresa.schema() + ".funcionamento_unidade";
        String horarios = empresa.schema() + ".horario_unidade";
        assertThatThrownBy(() -> executar("insert into " + configuracao + "(unidade_id,versao) values ('" + UUID.randomUUID() + "',0)"))
                .isInstanceOf(SQLException.class);
        executar("insert into " + configuracao + "(unidade_id,versao) values ('" + UNIDADE + "',0)");
        for (String valores : List.of("'INVALIDO',1,600,720", "'MESA',0,600,720", "'MESA',1,-1,720",
                "'MESA',1,600,600", "'MESA',1,600,2041")) {
            assertThatThrownBy(() -> executar("insert into " + horarios + " values ('" + UNIDADE + "'," + valores + ")"))
                    .isInstanceOf(SQLException.class);
        }
        executar("insert into " + horarios + " values ('" + UNIDADE + "','MESA',1,600,720)");
        assertThatThrownBy(() -> executar("insert into " + horarios + " values ('" + UNIDADE + "','MESA',1,600,780)"))
                .isInstanceOf(SQLException.class);
        assertThat(contar("horario_unidade")).isEqualTo(1);
    }

    private Empresa criarEmpresa(String nome) throws Exception {
        UUID id = UUID.randomUUID();
        var nova = new Empresa(id, "t_" + id.toString().replace("-", ""), "horarios-" + id + ".localhost");
        empresas.add(nova);
        TestDatabase.migrate(nova.schema(), "tenant");
        try (var connection = banco(); var statement = connection.createStatement()) {
            statement.execute("insert into public.empresa(id,nome,schema_name,estado) values ('" + id + "','Horários fictícios','" + nova.schema() + "','ATIVO')");
            statement.execute("insert into public.dominio(host,empresa_id) values ('" + nova.host() + "','" + id + "')");
            statement.execute("insert into " + nova.schema() + ".unidade(id,nome) values ('" + UNIDADE + "','" + nome + "1'),('" + OUTRA_UNIDADE + "','" + nome + "2')");
        }
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

    private void reautenticar(Empresa alvo, String access) throws Exception {
        var resposta = mvc.perform(post("/api/v1/auth/reautenticar").header("Host", alvo.host())
                .header("Authorization", "Bearer " + access).contentType("application/json")
                .content(mapper.writeValueAsString(Map.of("senha", SENHA))))
                .andReturn().getResponse();
        assertThat(resposta.getStatus()).isEqualTo(204);
    }

    private MockHttpServletResponse consultar(Empresa alvo, String access, UUID unidade) throws Exception {
        return mvc.perform(get(administrativo(unidade)).header("Host", alvo.host())
                .header("Authorization", "Bearer " + access)).andReturn().getResponse();
    }

    private MockHttpServletResponse consultarPublico(Empresa alvo, UUID unidade) throws Exception {
        return mvc.perform(get(publico(unidade)).header("Host", alvo.host())).andReturn().getResponse();
    }

    private MockHttpServletResponse alterar(Empresa alvo, String access, UUID unidade, Object body) throws Exception {
        return alterarJson(alvo, access, unidade, mapper.writeValueAsString(body));
    }

    private MockHttpServletResponse alterarJson(Empresa alvo, String access, UUID unidade, String body) throws Exception {
        return mvc.perform(put(administrativo(unidade)).header("Host", alvo.host())
                .header("Authorization", "Bearer " + access).contentType("application/json").content(body))
                .andReturn().getResponse();
    }

    private JsonNode json(MockHttpServletResponse resposta) throws Exception {
        return mapper.readTree(resposta.getContentAsString());
    }

    private JsonNode canal(JsonNode resposta, String nome) {
        for (var canal : resposta.get("canais")) {
            if (canal.get("canal").asText().equals(nome)) return canal;
        }
        throw new AssertionError("Canal esperado ausente: " + nome);
    }

    private String administrativo(UUID unidade) {
        return "/api/v1/configuracoes/unidades/" + unidade + "/funcionamento";
    }

    private String publico(UUID unidade) {
        return "/api/v1/unidades/" + unidade + "/funcionamento";
    }

    private Map<String, Object> corpo(long versao, List<String> canais, List<?> horarios) {
        return corpo(versao, 0, canais, horarios);
    }

    private Map<String, Object> corpo(long versao, long versaoUnidade, List<String> canais, List<?> horarios) {
        return Map.of("versao", versao, "versaoUnidade", versaoUnidade, "canais", canais, "horarios", horarios);
    }

    private Map<String, Object> horario(String canal, int dia, String inicio, String fim) {
        return Map.of("canal", canal, "diaSemana", dia, "inicio", inicio, "fim", fim);
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
        try (var connection = banco(); var statement = connection.createStatement();
                var result = statement.executeQuery("select count(*) from " + empresa.schema() + "." + tabela)) {
            result.next();
            return result.getLong(1);
        }
    }
}
