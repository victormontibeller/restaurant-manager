package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

import br.com.restaurantmanager.pedidos.dtos.TrabalhoDeadline;
import br.com.restaurantmanager.pedidos.services.PedidoDeadlineService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class PedidosDeadlineTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired PedidoDeadlineService deadlines;
    @MockitoBean(name = "pedidosClock") Clock clock;
    private PedidosCenario p;
    private Instant inicio;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void prepararCenario() throws Exception {
        inicio = Instant.now().truncatedTo(ChronoUnit.MICROS);
        when(clock.instant()).thenReturn(inicio);
        p = new PedidosCenario(mvc, mapper);
    }

    @AfterEach
    void limpar() throws Exception {
        p.close();
    }

    @Test
    void alertaUnicoEExpiracaoPersistemMesmoReprocessandoMesmaLease() throws Exception {
        var pedido = p.enviar(p.entrada(2));
        when(clock.instant()).thenReturn(inicio.plusSeconds(120));
        try (var scope = TenantScope.open(p.c.schema)) {
            var alerta = deadlines.reivindicar();
            assertThat(alerta).isNotNull();
            deadlines.processar(alerta);
            deadlines.processar(alerta);
            assertThat(deadlines.reivindicar()).isNull();
            when(clock.instant()).thenReturn(inicio.plusSeconds(300));
            var expiracao = deadlines.reivindicar();
            deadlines.processar(expiracao);
            deadlines.processar(expiracao);
        }
        var atual = p.detalhe(pedido);
        assertThat(atual.get("estado").asText()).isEqualTo("CANCELADO");
        validarAlertaEExpiracao(pedido, inicio.plusSeconds(120), inicio.plusSeconds(300));
        assertThat(p.contar("ajuste_cobranca")).isEqualTo(2);
        assertThat(p.contar("pedido_deadline_trabalho")).isZero();
    }

    @Test
    void primeiraExecucaoDepoisDosDoisPrazosRecuperaAlertaAntesDaExpiracao() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        var retomadaEm = inicio.plusSeconds(360);
        when(clock.instant()).thenReturn(retomadaEm);
        try (var scope = TenantScope.open(p.c.schema)) {
            var trabalho = deadlines.reivindicar();
            assertThat(trabalho).isNotNull();
            deadlines.processar(trabalho);
            deadlines.processar(trabalho);
            assertThat(deadlines.reivindicar()).isNull();
        }
        validarAlertaEExpiracao(pedido, retomadaEm, retomadaEm);
        assertThat(p.contar("ajuste_cobranca")).isEqualTo(1);
        assertThat(p.contar("pedido_deadline_trabalho")).isZero();
    }

    @Test
    void leaseAbandonadaRetomadaDepoisDaExpiracaoRecuperaAlertaUnico() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        when(clock.instant()).thenReturn(inicio.plusSeconds(120));
        var retomadaEm = inicio.plusSeconds(360);
        try (var scope = TenantScope.open(p.c.schema)) {
            var abandonada = deadlines.reivindicar();
            assertThat(abandonada).isNotNull();
            when(clock.instant()).thenReturn(retomadaEm);
            var retomada = deadlines.reivindicar();
            assertThat(retomada).isNotNull();
            assertThat(retomada.leaseId()).isNotEqualTo(abandonada.leaseId());
            deadlines.processar(abandonada);
            deadlines.processar(retomada);
            deadlines.processar(retomada);
            assertThat(deadlines.reivindicar()).isNull();
        }
        validarAlertaEExpiracao(pedido, retomadaEm, retomadaEm);
        assertThat(p.contar("ajuste_cobranca")).isEqualTo(1);
        assertThat(p.contar("pedido_deadline_trabalho")).isZero();
    }

    @Test
    void aceiteNoInstanteDaExpiracaoConfirmaCancelamentoAntesDoConflitoHttp() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        when(clock.instant()).thenReturn(inicio.plusSeconds(300));
        assertThat(p.acao(pedido, "aceitar", p.c.token, List.of()).getStatus()).isEqualTo(409);
        var atual = p.detalhe(pedido);
        assertThat(atual.get("estado").asText()).isEqualTo("CANCELADO");
        assertThat(atual.get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
        try (var scope = TenantScope.open(p.c.schema)) {
            var trabalho = deadlines.reivindicar();
            deadlines.processar(trabalho);
        }
        assertThat(p.contar("ajuste_cobranca")).isEqualTo(1);
        assertThat(p.acao(pedido, "aceitar", p.c.token, List.of()).getStatus()).isEqualTo(409);
        validarAlertaEExpiracao(pedido, inicio.plusSeconds(300), inicio.plusSeconds(300));
    }

    @Test
    void quedaRecuperaLeaseVencidaEWorkerAntigoNaoConcluiTentativaNova() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        when(clock.instant()).thenReturn(inicio.plusSeconds(120));
        try (var scope = TenantScope.open(p.c.schema)) {
            var abandonada = deadlines.reivindicar();
            assertThat(deadlines.reivindicar()).isNull();
            when(clock.instant()).thenReturn(inicio.plusSeconds(241));
            var retomada = deadlines.reivindicar();
            assertThat(retomada.leaseId()).isNotEqualTo(abandonada.leaseId());
            deadlines.processar(abandonada);
            deadlines.processar(retomada);
        }
        assertThat(p.detalhe(pedido).get("historico").size()).isEqualTo(2);
    }

    @Test
    void ultimaLeaseAbandonadaViraPendenciaDuravelSemRetryInfinito() throws Exception {
        p.enviar(p.entrada(1));
        try (var scope = TenantScope.open(p.c.schema)) {
            for (int tentativa = 0; tentativa < 5; tentativa++) {
                when(clock.instant()).thenReturn(inicio.plusSeconds(120L + tentativa * 121L));
                assertThat(deadlines.reivindicar()).isNotNull();
            }
            when(clock.instant()).thenReturn(inicio.plusSeconds(800));
            assertThat(deadlines.reivindicar()).isNull();
        }
        try (var conexao = p.banco(); var sql = conexao.createStatement();
                var resultado = sql.executeQuery("select bloqueado,tentativas,ultima_falha from " + p.c.schema + ".pedido_deadline_trabalho")) {
            assertThat(resultado.next()).isTrue();
            assertThat(resultado.getBoolean(1)).isTrue();
            assertThat(resultado.getInt(2)).isEqualTo(5);
            assertThat(resultado.getString(3)).isEqualTo("LeaseExpirado");
        }
    }

    @Test
    void aceiteEJobConcorrentesNoLimiteGeramUmCancelamentoUmAjuste() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        when(clock.instant()).thenReturn(inicio.plusSeconds(300));
        TrabalhoDeadline trabalho;
        try (var scope = TenantScope.open(p.c.schema)) { trabalho = deadlines.reivindicar(); }
        var respostas = PedidosConcorrenciaTest.disputar(
                () -> p.acao(pedido, "aceitar", p.c.token, List.of()).getStatus(),
                () -> { try (var scope = TenantScope.open(p.c.schema)) { deadlines.processar(trabalho); } return 200; });
        assertThat(respostas).containsExactlyInAnyOrder(409, 200);
        assertThat(p.contar("ajuste_cobranca")).isEqualTo(1);
        validarAlertaEExpiracao(pedido, inicio.plusSeconds(300), inicio.plusSeconds(300));
    }

    private void validarAlertaEExpiracao(JsonNode pedido, Instant alertaEm, Instant expiracaoEm) throws Exception {
        var atual = p.detalhe(pedido);
        assertThat(atual.get("estado").asText()).isEqualTo("CANCELADO");
        assertThat(atual.get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
        var historico = atual.get("historico");
        var tipos = new ArrayList<String>();
        historico.forEach(evento -> tipos.add(evento.get("tipo").asText()));
        assertThat(tipos).containsExactly("PEDIDO_ENVIADO", "ACEITE_ATRASADO", "PEDIDO_EXPIRADO");
        assertThat(Instant.parse(historico.get(1).get("ocorridoEm").asText())).isEqualTo(alertaEm);
        assertThat(Instant.parse(historico.get(2).get("ocorridoEm").asText())).isEqualTo(expiracaoEm);
        assertThat(Instant.parse(atual.get("alertarEm").asText())).isEqualTo(inicio.plusSeconds(120));
        assertThat(Instant.parse(atual.get("expirarEm").asText())).isEqualTo(inicio.plusSeconds(300));

        Map<String, List<String>> eventos = new LinkedHashMap<>();
        try (var conexao = p.banco(); var sql = conexao.prepareStatement(
                "select fluxo,tipo from " + p.c.schema + ".evento_operacional where pedido_id=? order by fluxo,sequencia")) {
            sql.setObject(1, UUID.fromString(pedido.get("id").asText()));
            try (var resultado = sql.executeQuery()) {
                while (resultado.next()) eventos.computeIfAbsent(resultado.getString(1), chave -> new ArrayList<>())
                        .add(resultado.getString(2));
            }
        }
        assertThat(eventos.keySet()).containsExactlyInAnyOrder("operacao:" + UNIDADE, "cliente:" + UNIDADE + ":" + p.cliente);
        assertThat(eventos.values()).allSatisfy(sequencia ->
                assertThat(sequencia).containsExactly("PEDIDO_ENVIADO", "ACEITE_ATRASADO", "PEDIDO_EXPIRADO"));
    }
}
