package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.comunicacoes.repositories.NotificacaoRepository;
import br.com.restaurantmanager.comunicacoes.services.NotificacaoService;
import br.com.restaurantmanager.identidade.infrastructure.CapturaEmail;
import br.com.restaurantmanager.identidade.infrastructure.ProtecaoEmail;
import br.com.restaurantmanager.tenancy.context.TenantScope;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@SpringBootTest(properties = "rm.stage=test")
@AutoConfigureMockMvc
class NotificacaoOperacionalTest {
    private static final Path ROOT;

    static {
        try {
            ROOT =
                    Files.createTempDirectory(
                            "rm-sprint04-email-",
                            PosixFilePermissions.asFileAttribute(
                                    PosixFilePermissions.fromString("rwx------")));
        } catch (Exception e) {
            throw new ExceptionInInitializerError(e);
        }
    }

    @DynamicPropertySource
    static void propriedades(DynamicPropertyRegistry r) {
        byte[] key = new byte[32];
        new SecureRandom().nextBytes(key);
        r.add("rm.email.secret", () -> Base64.getEncoder().encodeToString(key));
        r.add("rm.email.capture-directory", ROOT::toString);
    }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired NotificacaoService service;
    @Autowired NotificacaoRepository repository;
    @Autowired ProtecaoEmail protecao;
    @Autowired CapturaEmail captura;
    @Autowired PlatformTransactionManager manager;
    private PedidosCenario p;

    @BeforeAll
    static void banco() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void preparar() throws Exception {
        p = new PedidosCenario(mvc, mapper);
    }

    @AfterEach
    void limpar() throws Exception {
        p.close();
    }

    @AfterAll
    static void remover() throws Exception {
        try (var files = Files.walk(ROOT)) {
            for (Path path : files.sorted(Comparator.reverseOrder()).toList()) Files.delete(path);
        }
    }

    @Test
    void capturaTemTemplateEstadoEMetadadosSemDadosPessoais() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        p.acao(pedido, "aceitar", List.of());
        try (var scope = TenantScope.open(p.c.schema)) {
            assertThat(service.processarProxima()).isTrue();
            assertThat(service.processarProxima()).isFalse();
        }
        var r =
                p.c.enviar(
                        "GET",
                        "/api/v1/operacao/notificacoes?unidadeId=" + CatalogoCenario.UNIDADE,
                        p.funcionario("GERENTE"),
                        null);
        assertThat(r.getStatus()).as(r.getContentAsString()).isEqualTo(200);
        assertThat(p.c.json(r).get(0).get("estado").asText()).isEqualTo("CAPTURADO");
        assertThat(r.getContentAsString()).doesNotContain("@", "conteudo", "email");
        try (var files = Files.list(ROOT.resolve(p.c.schema))) {
            var path = files.findFirst().orElseThrow();
            assertThat(Files.readString(path)).contains("Seu pedido foi aceito", "CAPTURA LOCAL");
            assertThat(Files.getPosixFilePermissions(path))
                    .isEqualTo(PosixFilePermissions.fromString("rw-------"));
        }
    }

    @Test
    void falhaNaoDesfazVendaETentativasSaoLimitadas() throws Exception {
        p.c.executar(
                "update "
                        + p.c.schema
                        + ".usuario set email_verificado=false where id='"
                        + p.cliente
                        + "'");
        var pedido = p.enviar(p.entrada(1));
        p.acao(pedido, "aceitar", List.of());
        for (int i = 0; i < 5; i++) {
            try (var scope = TenantScope.open(p.c.schema)) {
                assertThat(service.processarProxima()).isTrue();
            }
            p.c.executar("update " + p.c.schema + ".notificacao_operacional set proximo_em=now()");
        }
        try (var scope = TenantScope.open(p.c.schema)) {
            assertThat(service.processarProxima()).isFalse();
        }
        assertThat(p.detalhe(pedido).get("estado").asText()).isEqualTo("NA_FILA");
        var r =
                p.c.json(
                                p.c.enviar(
                                        "GET",
                                        "/api/v1/operacao/notificacoes?unidadeId="
                                                + CatalogoCenario.UNIDADE,
                                        p.c.token,
                                        null))
                        .get(0);
        assertThat(r.get("estado").asText()).isEqualTo("FALHOU");
        assertThat(r.get("tentativas").asInt()).isEqualTo(5);
    }

    @Test
    void recuperaLeaseAposCapturaAntesDaConfirmacaoSemDuplicarArquivo() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        p.acao(pedido, "aceitar", List.of());
        var tx = new TransactionTemplate(manager);
        try (var scope = TenantScope.open(p.c.schema)) {
            var trabalho = tx.execute(s -> repository.reivindicar());
            String conteudo = "Captura controlada de teste " + UUID.randomUUID();
            tx.executeWithoutResult(
                    s -> repository.conteudo(trabalho, protecao.cifrar(trabalho.id(), conteudo)));
            captura.entregar(trabalho.id(), conteudo);
            p.c.executar(
                    "update "
                            + p.c.schema
                            + ".notificacao_operacional set lease_ate=now()-interval '1"
                            + " second',proximo_em=now()");
            assertThat(service.processarProxima()).isTrue();
            assertThat(service.processarProxima()).isFalse();
            assertThat(Files.readString(ROOT.resolve(p.c.schema).resolve(trabalho.id() + ".txt")))
                    .isEqualTo(conteudo);
            try (var files = Files.list(ROOT.resolve(p.c.schema))) {
                assertThat(files.count()).isEqualTo(1);
            }
        }
    }
}
