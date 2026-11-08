package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class PedidosConcorrenciaTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private PedidosCenario p;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void prepararCenario() throws Exception {
        p = new PedidosCenario(mvc, mapper);
    }

    @AfterEach
    void limpar() throws Exception {
        p.close();
    }

    @Test
    void duasCriacoesComMesmaIntencaoProduzemUmPedidoUmaCobrancaUmHistorico() throws Exception {
        var entrada = p.entrada(3);
        var respostas = disputar(
                () -> p.c.enviar("POST", "/api/v1/pedidos", p.tokenCliente, entrada).getStatus(),
                () -> p.c.enviar("POST", "/api/v1/pedidos", p.tokenCliente, entrada).getStatus());
        assertThat(respostas).containsExactlyInAnyOrder(200, 200);
        assertThat(p.contar("pedido")).isEqualTo(1);
        assertThat(p.contar("unidade_producao")).isEqualTo(3);
        assertThat(p.contar("cobranca_parcela")).isEqualTo(3);
        assertThat(p.contar("pedido_historico")).isEqualTo(1);
    }

    @Test
    void primeiroPreparoEAutocancelamentoTemUmVencedorSemReparoPosterior() throws Exception {
        var pedido = p.acao(p.enviar(p.entrada(1)), "aceitar", List.of());
        String id = pedido.get("id").asText();
        var iniciar = p.comando(pedido, p.unidades(pedido));
        var cancelar = p.comando(pedido, List.of());
        var respostas = disputar(
                () -> p.c.enviar("POST", "/api/v1/cozinha/pedidos/" + id + "/iniciar", p.c.token, iniciar).getStatus(),
                () -> p.c.enviar("POST", "/api/v1/me/pedidos/" + id + "/cancelar", p.tokenCliente, cancelar).getStatus());
        assertThat(respostas).containsExactlyInAnyOrder(200, 409);
        var atual = p.detalhe(pedido);
        if (atual.get("estado").asText().equals("CANCELADO")) {
            assertThat(atual.get("primeiroPreparoEm").isNull()).isTrue();
            assertThat(atual.get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
        } else {
            assertThat(atual.get("estado").asText()).isEqualTo("EM_PREPARO");
            assertThat(atual.get("saldo").get("totalDevido").asText()).isEqualTo("20.00");
        }
        assertThat(atual.get("versao").asLong()).isEqualTo(2);
    }

    @Test
    void doisLotesConcorrentesNaoIniciamMesmaUnidadeDuasVezes() throws Exception {
        var pedido = p.acao(p.enviar(p.entrada(2)), "aceitar", List.of());
        String rota = "/api/v1/cozinha/pedidos/" + pedido.get("id").asText() + "/iniciar";
        var primeiro = p.comando(pedido, List.of(p.unidades(pedido).getFirst()));
        var segundo = p.comando(pedido, p.unidades(pedido));
        var respostas = disputar(
                () -> p.c.enviar("POST", rota, p.c.token, primeiro).getStatus(),
                () -> p.c.enviar("POST", rota, p.c.token, segundo).getStatus());
        assertThat(respostas).containsExactlyInAnyOrder(200, 409);
        assertThat(p.detalhe(pedido).get("versao").asLong()).isEqualTo(2);
        assertThat(p.contar("pedido_comando")).isEqualTo(2);
    }

    @Test
    void envioAguardandoCatalogoRevalidaPrecoAposCommitDoEditor() throws Exception {
        enviarEnquantoBloqueado("select versao from " + p.c.schema + ".catalogo_revisao where id=1 for update",
                List.of("update " + p.c.schema + ".produto_unidade set preco=21,versao=versao+1 where produto_id='" + p.produto.id() + "'",
                        "update " + p.c.schema + ".catalogo_revisao set versao=versao+1 where id=1"), 409);
    }

    @Test
    void envioAguardandoEmpresaNaoPassaDepoisDaSuspensaoConfirmada() throws Exception {
        enviarEnquantoBloqueado("select estado from public.empresa where id='" + p.c.empresa + "' for update",
                List.of("update public.empresa set estado='SUSPENSO' where id='" + p.c.empresa + "'"), 409);
    }

    @Test
    void envioAguardandoPoliticaNaoPassaDepoisDaInativacaoDaUnidade() throws Exception {
        enviarEnquantoBloqueado("select versao from " + p.c.schema + ".politica_acesso where id=1 for update",
                List.of("update " + p.c.schema + ".unidade set ativa=false,versao=versao+1 where id='" + CatalogoCenario.UNIDADE + "'"), 404);
    }

    private void enviarEnquantoBloqueado(String lock, List<String> alteracoes, int esperado) throws Exception {
        var entrada = p.entrada(1);
        try (var bloqueador = p.banco(); var executor = Executors.newSingleThreadExecutor()) {
            bloqueador.setAutoCommit(false);
            try (var sql = bloqueador.createStatement()) {
                sql.execute(lock);
                var envio = executor.submit(() -> p.c.enviar("POST", "/api/v1/pedidos", p.tokenCliente, entrada).getStatus());
                try {
                    aguardarTransacaoBloqueada();
                    for (String alteracao : alteracoes) sql.execute(alteracao);
                    bloqueador.commit();
                    assertThat(envio.get(25, TimeUnit.SECONDS)).isEqualTo(esperado);
                } finally {
                    bloqueador.rollback();
                }
            }
        }
        assertThat(p.contar("pedido")).isZero();
    }

    private void aguardarTransacaoBloqueada() throws Exception {
        Instant limite = Instant.now().plus(Duration.ofSeconds(10));
        try (var observador = p.banco(); var sql = observador.createStatement()) {
            while (Instant.now().isBefore(limite)) {
                try (var linhas = sql.executeQuery("select exists(select 1 from pg_locks l join pg_stat_activity a on a.pid=l.pid "
                        + "where not l.granted and a.usename='rm_test_app' and a.datname=current_database())")) {
                    linhas.next();
                    if (linhas.getBoolean(1)) return;
                }
                LockSupport.parkNanos(Duration.ofMillis(10).toNanos());
            }
        }
        throw new AssertionError("A requisição não alcançou a barreira PostgreSQL esperada.");
    }

    static List<Integer> disputar(Callable<Integer> primeira, Callable<Integer> segunda) throws Exception {
        var inicio = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var a = executor.submit(() -> { inicio.await(); return primeira.call(); });
            var b = executor.submit(() -> { inicio.await(); return segunda.call(); });
            inicio.countDown();
            return List.of(a.get(25, TimeUnit.SECONDS), b.get(25, TimeUnit.SECONDS));
        }
    }
}
