package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static br.com.restaurantmanager.CatalogoCenario.OUTRA_UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.services.TenantService;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class EventosOperacionaisTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EventoOperacionalService eventos;
    @Autowired TenantService tenants;
    @Autowired PlatformTransactionManager transactionManager;
    private CatalogoCenario c;

    @BeforeAll
    static void preparar() throws Exception { TestDatabase.prepare(); }

    @BeforeEach
    void massa() throws Exception { c = new CatalogoCenario(mvc, mapper); }

    @AfterEach
    void limpar() throws Exception { c.close(); }

    private void transacao(Runnable trabalho) {
        try (var scope = TenantScope.open(c.schema)) {
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> trabalho.run());
        }
    }

    private void registrar(UUID unidade, UUID usuario, String tipo) {
        transacao(() -> eventos.registrar(unidade, tipo, null, null, usuario, null));
    }

    private String caminho(UUID unidade, String cursor) {
        return "/api/v1/eventos?unidadeId=" + unidade + "&depois=" + cursor;
    }

    @Test
    void clienteRecebeSomenteSeuFluxoSemContadorDeOutrosClientesOuUnidades() throws Exception {
        UUID primeiro = c.usuario("CLIENTE");
        UUID segundo = c.usuario("CLIENTE");
        String access = c.login(primeiro);
        registrar(UNIDADE, segundo, "PEDIDO_CRIADO");
        registrar(OUTRA_UNIDADE, primeiro, "PEDIDO_CRIADO");
        registrar(UNIDADE, primeiro, "PEDIDO_CRIADO");

        var resposta = c.enviar("GET", caminho(UNIDADE, "-1"), access, null);
        assertThat(resposta.getStatus()).isEqualTo(200);
        var pagina = c.json(resposta);
        assertThat(pagina.get("eventos").size()).isEqualTo(1);
        assertThat(pagina.get("proximo").asText()).isEqualTo("1");
        assertThat(resposta.getContentAsString()).doesNotContain("usuarioId", "endereco", "saldo", "email", "schema");
        assertThat(c.json(c.enviar("GET", caminho(UNIDADE, "1"), access, null)).get("eventos").size()).isZero();
        assertThat(c.enviar("GET", caminho(UNIDADE, "2"), access, null).getStatus()).isEqualTo(409);
        assertThat(c.enviar("GET", caminho(UNIDADE, "999999999999999999999"), access, null).getStatus()).isEqualTo(400);
    }

    @Test
    void operadorRevalidaAcaoUnidadeESessaoEMantemConclusaoEmUnidadeInativa() throws Exception {
        UUID cozinha = c.usuario("COZINHA");
        c.vincular(cozinha, UNIDADE);
        String access = c.login(cozinha);
        registrar(UNIDADE, null, "PRODUCAO_INICIADA");
        assertThat(c.enviar("GET", caminho(OUTRA_UNIDADE, "-1"), access, null).getStatus()).isEqualTo(404);
        c.executar("update " + c.schema + ".unidade set ativa=false where id='" + UNIDADE + "'");
        assertThat(c.enviar("GET", caminho(UNIDADE, "-1"), access, null).getStatus()).isEqualTo(200);
        assertThat(c.json(c.enviar("GET", "/api/v1/operacao/unidades-existentes", access, null)).size()).isEqualTo(1);
        c.executar("delete from " + c.schema + ".permissao_perfil where perfil='COZINHA' and acao='pedido.consultar'");
        assertThat(c.enviar("GET", caminho(UNIDADE, "-1"), access, null).getStatus()).isEqualTo(403);
        c.executar("update " + c.schema + ".sessao set revogada_em=clock_timestamp() where usuario_id='" + cozinha + "'");
        assertThat(c.enviar("GET", caminho(UNIDADE, "-1"), access, null).getStatus()).isEqualTo(401);
    }

    @Test
    void rollbackNaoPublicaEventoENaoConsomeCursor() throws Exception {
        assertThatThrownBy(() -> transacao(() -> {
            eventos.registrar(UNIDADE, "PEDIDO_CRIADO", null, null, null, null);
            throw new IllegalStateException("Falha controlada antes do commit.");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(c.json(c.enviar("GET", caminho(UNIDADE, "-1"), c.token, null)).get("proximo").asText()).isEqualTo("0");
        registrar(UNIDADE, null, "PEDIDO_CRIADO");
        assertThat(c.json(c.enviar("GET", caminho(UNIDADE, "-1"), c.token, null)).get("proximo").asText()).isEqualTo("1");
    }

    @Test
    void cursorNaoSaltaCommitAindaInvisivelComDoisEscritores() throws Exception {
        var gravado = new CountDownLatch(1);
        var liberar = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var primeiro = executor.submit(() -> transacao(() -> {
                eventos.registrar(UNIDADE, "PRIMEIRO", null, null, null, null);
                gravado.countDown();
                try {
                    if (!liberar.await(10, TimeUnit.SECONDS)) throw new AssertionError("Commit não liberado.");
                } catch (InterruptedException error) {
                    Thread.currentThread().interrupt();
                    throw new IllegalStateException(error);
                }
            }));
            assertThat(gravado.await(10, TimeUnit.SECONDS)).isTrue();
            try {
                var durante = c.json(c.enviar("GET", caminho(UNIDADE, "-1"), c.token, null));
                assertThat(durante.get("proximo").asText()).isEqualTo("0");
                var segundo = executor.submit(() -> registrar(UNIDADE, null, "SEGUNDO"));
                liberar.countDown();
                primeiro.get(10, TimeUnit.SECONDS);
                segundo.get(10, TimeUnit.SECONDS);
            } finally {
                liberar.countDown();
            }
        }
        var pagina = c.json(c.enviar("GET", caminho(UNIDADE, "0"), c.token, null));
        assertThat(pagina.get("eventos").size()).isEqualTo(2);
        assertThat(pagina.get("eventos").get(0).get("tipo").asText()).isEqualTo("PRIMEIRO");
        assertThat(pagina.get("eventos").get(1).get("tipo").asText()).isEqualTo("SEGUNDO");
        assertThat(pagina.get("proximo").asText()).isEqualTo("2");
    }

    @Test
    void suspensaoBloqueiaNovasVendasMasPreservaConsultaOperacionalAutorizada() throws Exception {
        transacao(tenants::exigirNovasOperacoes);
        c.executar("update public.empresa set estado='SUSPENSO' where id='" + c.empresa + "'");
        assertThatThrownBy(() -> transacao(tenants::exigirNovasOperacoes)).isInstanceOf(AuthFailure.class);
        assertThat(c.enviar("GET", caminho(UNIDADE, "-1"), c.token, null).getStatus()).isEqualTo(200);
        try (var outro = new CatalogoCenario(mvc, mapper)) {
            registrar(UNIDADE, null, "NAO_COMPARTILHAR");
            var pagina = outro.json(outro.enviar("GET", caminho(UNIDADE, "-1"), outro.token, null));
            assertThat(pagina.get("eventos").size()).isZero();
            assertThat(outro.enviar("GET", caminho(UNIDADE, "-1"), c.token, null).getStatus()).isEqualTo(401);
        }
    }
}
