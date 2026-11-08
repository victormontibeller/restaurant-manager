package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Calcular;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.catalogo.dtos.Produto;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;
import java.util.stream.IntStream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class PedidosSolicitacoesMesaTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private MesasCenario m;
    private Produto produto;
    private UUID comanda;
    private String participante;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void prepararCenario() throws Exception {
        m = new MesasCenario(mvc, mapper);
        produto = m.base.produto(m.base.categoria("Solicitações"), "Lanche da mesa", List.of(), List.of());
        m.base.ofertar(produto.id(), UNIDADE, "20.00", true);
        m.base.executar("update " + m.base.schema + ".produto_unidade set mesa=true");
        var atendimento = m.abrir();
        comanda = m.comanda(atendimento);
        participante = m.token(m.autorizar(atendimento));
    }

    @AfterEach
    void limpar() throws Exception {
        m.close();
    }

    @Test
    void cancelamentoDiretoIntegralAprovaPendenteSemDuplicarAjusteHistoricoOuEventoNoReplay() throws Exception {
        var pedido = prepararESolicitar(2);
        var comando = comando(pedido, List.of());
        var resposta = acao(pedido, "cancelar", comando);
        assertThat(resposta.getStatus()).isEqualTo(200);
        var cancelado = m.base.json(resposta);
        assertThat(cancelado.get("estado").asText()).isEqualTo("CANCELADO");
        assertThat(cancelado.get("solicitacoes").get(0).get("estado").asText()).isEqualTo("APROVADA");
        assertThat(contarHistorico(cancelado, "CANCELAMENTO_APROVADO")).isEqualTo(1);
        assertThat(m.base.contar("ajuste_cobranca")).isEqualTo(2);
        long eventos = m.base.contar("evento_operacional");
        long historico = m.base.contar("pedido_historico");
        var repetida = acao(pedido, "cancelar", comando);
        assertThat(repetida.getStatus()).isEqualTo(200);
        assertThat(m.base.json(repetida)).isEqualTo(cancelado);
        assertThat(m.base.contar("ajuste_cobranca")).isEqualTo(2);
        assertThat(m.base.contar("evento_operacional")).isEqualTo(eventos);
        assertThat(m.base.contar("pedido_historico")).isEqualTo(historico);
        var proprio = m.base.json(m.base.enviar("GET", "/api/v1/mesa/pedidos/" + pedido.get("id").asText(), participante, null));
        assertThat(proprio.get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
        assertThat(m.estado(comanda, "iniciar-fechamento", 0).getStatus()).isEqualTo(200);
        assertThat(m.estado(comanda, "concluir", 1).getStatus()).isEqualTo(200);
    }

    @Test
    void cancelamentoParcialMantemSolicitacaoAteCancelarUltimaUnidade() throws Exception {
        var pedido = prepararESolicitar(2);
        UUID primeira = unidade(pedido, 0);
        var parcial = executar(pedido, "cancelar", List.of(primeira));
        assertThat(parcial.get("estado").asText()).isEqualTo("EM_PREPARO");
        assertThat(parcial.get("solicitacoes").get(0).get("estado").asText()).isEqualTo("PENDENTE");
        assertThat(contarHistorico(parcial, "CANCELAMENTO_APROVADO")).isZero();
        assertThat(m.base.contar("ajuste_cobranca")).isEqualTo(1);
        var cancelado = executar(parcial, "cancelar", List.of(unidade(pedido, 1)));
        assertThat(cancelado.get("solicitacoes").get(0).get("estado").asText()).isEqualTo("APROVADA");
        assertThat(contarHistorico(cancelado, "CANCELAMENTO_APROVADO")).isEqualTo(1);
        assertThat(m.base.contar("ajuste_cobranca")).isEqualTo(2);
    }

    @Test
    void servirExigeDecisaoExplicitaDaSolicitacaoPendente() throws Exception {
        var pedido = prepararESolicitar(1);
        var pronto = executar(pedido, "concluir", List.of(unidade(pedido, 0)));
        assertThat(acao(pronto, "servir", comando(pronto, List.of())).getStatus()).isEqualTo(409);
        var rejeitado = decidir(pronto, "rejeitar", List.of());
        assertThat(rejeitado.get("solicitacoes").get(0).get("estado").asText()).isEqualTo("REJEITADA");
        var servido = executar(rejeitado, "servir", List.of());
        assertThat(servido.get("estado").asText()).isEqualTo("CONCLUIDO");
        assertThat(m.base.contar("ajuste_cobranca")).isZero();
    }

    @Test
    void aprovacaoExplicitaIntegralTemUmaDecisaoEUmAbatimentoPorUnidade() throws Exception {
        var pedido = prepararESolicitar(2);
        var aprovado = decidir(pedido, "aprovar", List.of());
        assertThat(aprovado.get("estado").asText()).isEqualTo("CANCELADO");
        assertThat(aprovado.get("solicitacoes").get(0).get("estado").asText()).isEqualTo("APROVADA");
        assertThat(contarHistorico(aprovado, "CANCELAMENTO_APROVADO")).isEqualTo(1);
        assertThat(m.base.contar("ajuste_cobranca")).isEqualTo(2);
    }

    @Test
    void aprovacaoComSelecaoInvalidaDesfazDecisaoHistoricoEEventos() throws Exception {
        var pedido = prepararESolicitar(1);
        long eventos = m.base.contar("evento_operacional");
        long historico = m.base.contar("pedido_historico");
        String rota = "/api/v1/operacao/pedidos/" + pedido.get("id").asText() + "/solicitacoes/"
                + pedido.get("solicitacoes").get(0).get("id").asText() + "/aprovar";
        var invalida = m.base.enviar("POST", rota, m.base.token, comando(pedido, List.of(UUID.randomUUID())));
        assertThat(invalida.getStatus()).isEqualTo(409);
        var atual = m.base.enviar("GET", "/api/v1/mesa/pedidos/" + pedido.get("id").asText(), participante, null);
        assertThat(atual.getStatus()).isEqualTo(200);
        assertThat(m.base.json(atual)).isEqualTo(pedido);
        assertThat(m.base.contar("ajuste_cobranca")).isZero();
        assertThat(m.base.contar("evento_operacional")).isEqualTo(eventos);
        assertThat(m.base.contar("pedido_historico")).isEqualTo(historico);
        assertThat(decidir(pedido, "aprovar", List.of()).get("solicitacoes").get(0).get("estado").asText())
                .isEqualTo("APROVADA");
    }

    @Test
    void replayDaMesaRevalidaSessaoDepoisDeEsperarComanda() throws Exception {
        var entrada = entrada(1);
        assertThat(m.base.enviar("POST", "/api/v1/mesa/pedidos", participante, entrada).getStatus()).isEqualTo(200);
        long eventos = m.base.contar("evento_operacional");
        try (var bloqueador = m.base.banco(); var executor = Executors.newSingleThreadExecutor()) {
            bloqueador.setAutoCommit(false);
            try (var sql = bloqueador.createStatement()) {
                int pid;
                try (var linha = sql.executeQuery("select pg_backend_pid()")) {
                    linha.next();
                    pid = linha.getInt(1);
                }
                sql.execute("select id from " + m.base.schema + ".comanda where id='" + comanda + "' for update");
                var replay = executor.submit(() -> m.base.enviar("POST", "/api/v1/mesa/pedidos", participante, entrada));
                try {
                    aguardarReplayBloqueado(pid);
                    // A fixture confirma uma revogação sob o mesmo lock usado pelo logout.
                    sql.executeUpdate("update " + m.base.schema + ".sessao_mesa set revogada_em=now()");
                    bloqueador.commit();
                    assertThat(replay.get(20, TimeUnit.SECONDS).getStatus()).isEqualTo(401);
                } finally {
                    bloqueador.rollback();
                }
            }
        }
        assertThat(m.base.contar("pedido")).isEqualTo(1);
        assertThat(m.base.contar("cobranca_parcela")).isEqualTo(1);
        assertThat(m.base.contar("evento_operacional")).isEqualTo(eventos);
    }

    private void aguardarReplayBloqueado(int pid) throws Exception {
        Instant limite = Instant.now().plusSeconds(10);
        try (var observador = m.base.banco(); var sql = observador.createStatement()) {
            while (Instant.now().isBefore(limite)) {
                try (var resultado = sql.executeQuery("select exists(select 1 from pg_stat_activity a "
                        + "where a.datname=current_database() and a.usename='rm_test_app' "
                        + "and " + pid + "=any(pg_blocking_pids(a.pid)))")) {
                    resultado.next();
                    if (resultado.getBoolean(1)) return;
                }
                LockSupport.parkNanos(Duration.ofMillis(10).toNanos());
            }
        }
        throw new AssertionError("O replay não aguardou o lock da comanda.");
    }

    private EnviarPedido entrada(int quantidade) throws Exception {
        var linhas = List.of(new Linha(UUID.randomUUID(), produto.id(), quantidade, List.of(), List.of()));
        var quote = m.base.enviar("POST", "/api/v1/carrinho/calcular", null, new Calcular(UNIDADE, CanalAtendimento.MESA, linhas, null));
        assertThat(quote.getStatus()).isEqualTo(200);
        return new EnviarPedido(UUID.randomUUID(), UNIDADE, CanalAtendimento.MESA, comanda,
                m.base.json(quote).get("revisao").asText(), linhas, "", null);
    }

    private JsonNode prepararESolicitar(int quantidade) throws Exception {
        var entrada = entrada(quantidade);
        var enviado = m.base.enviar("POST", "/api/v1/mesa/pedidos", participante, entrada);
        assertThat(enviado.getStatus()).isEqualTo(200);
        var pedido = m.base.json(enviado);
        var ids = IntStream.range(0, quantidade).mapToObj(i -> unidade(pedido, i)).toList();
        var iniciado = executar(pedido, "iniciar", ids);
        var solicitacao = m.base.enviar("POST", "/api/v1/mesa/pedidos/" + pedido.get("id").asText() + "/solicitar-cancelamento",
                participante, comando(iniciado, List.of()));
        assertThat(solicitacao.getStatus()).isEqualTo(200);
        return m.base.json(solicitacao);
    }

    private JsonNode decidir(JsonNode pedido, String acao, List<UUID> unidades) throws Exception {
        String rota = "/api/v1/operacao/pedidos/" + pedido.get("id").asText() + "/solicitacoes/"
                + pedido.get("solicitacoes").get(0).get("id").asText() + "/" + acao;
        var resposta = m.base.enviar("POST", rota, m.base.token, comando(pedido, unidades));
        assertThat(resposta.getStatus()).isEqualTo(200);
        return m.base.json(resposta);
    }

    private JsonNode executar(JsonNode pedido, String acao, List<UUID> unidades) throws Exception {
        var resposta = acao(pedido, acao, comando(pedido, unidades));
        assertThat(resposta.getStatus()).isEqualTo(200);
        return m.base.json(resposta);
    }

    private MockHttpServletResponse acao(JsonNode pedido, String acao, ComandoPedido comando) throws Exception {
        String base = acao.equals("iniciar") || acao.equals("concluir") ? "/api/v1/cozinha/pedidos/" : "/api/v1/operacao/pedidos/";
        return m.base.enviar("POST", base + pedido.get("id").asText() + "/" + acao, m.base.token, comando);
    }

    private ComandoPedido comando(JsonNode pedido, List<UUID> unidades) {
        return new ComandoPedido(UUID.randomUUID(), pedido.get("versao").asLong(), "Motivo fictício", unidades);
    }

    private UUID unidade(JsonNode pedido, int indice) {
        return UUID.fromString(pedido.get("unidades").get(indice).get("id").asText());
    }

    private long contarHistorico(JsonNode pedido, String tipo) {
        return IntStream.range(0, pedido.get("historico").size())
                .filter(i -> pedido.get("historico").get(i).get("tipo").asText().equals(tipo)).count();
    }
}
