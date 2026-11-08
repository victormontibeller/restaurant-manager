package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;

import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class PedidosReplayTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockitoSpyBean PedidoRepository repository;
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
    void replayDoClienteReleEstadoUnidadesHistoricoESaldoAposCancelamentoConcorrente() throws Exception {
        verificarReplayConcorrente(false, "cancelar");
    }

    @Test
    void replayAssistidoReleVersaoEPrimeiroPreparoAposInicioConcorrente() throws Exception {
        verificarReplayConcorrente(true, "iniciar");
    }

    private void verificarReplayConcorrente(boolean assistido, String acao) throws Exception {
        var entrada = p.entrada(2);
        String rota = assistido ? "/api/v1/operacao/pedidos" : "/api/v1/pedidos";
        String token = assistido ? p.c.token : p.tokenCliente;
        var criado = p.c.enviar("POST", rota, token, entrada);
        assertThat(criado.getStatus()).isEqualTo(200);
        var pedido = p.acao(p.c.json(criado), "aceitar", List.of());
        UUID id = entrada.intencaoId();
        var leituraInicial = new CountDownLatch(1);
        var continuarReplay = new CountDownLatch(1);
        var primeiraLeitura = new AtomicBoolean(true);
        // A barreira fica depois do SELECT real, antes da autorização e projeção.
        // A alteração concorrente usa a API e confirma sua própria transação.
        doAnswer(invocacao -> {
            Object resultado = invocacao.callRealMethod();
            if (primeiraLeitura.compareAndSet(true, false)) {
                leituraInicial.countDown();
                if (!continuarReplay.await(10, TimeUnit.SECONDS)) {
                    throw new AssertionError("O replay não foi liberado após a alteração concorrente.");
                }
            }
            return resultado;
        }).when(repository).consultar(id, false);

        try (var executor = Executors.newSingleThreadExecutor()) {
            var replay = executor.submit(() -> p.c.enviar("POST", rota, token, entrada));
            try {
                assertThat(leituraInicial.await(10, TimeUnit.SECONDS)).isTrue();
                var alterado = p.acao(pedido, acao, acao.equals("iniciar") ? p.unidades(pedido) : List.of());
                continuarReplay.countDown();
                var resposta = replay.get(20, TimeUnit.SECONDS);
                assertThat(resposta.getStatus()).isEqualTo(200);
                String consulta = assistido ? "/api/v1/operacao/pedidos/" : "/api/v1/me/pedidos/";
                var atual = p.c.enviar("GET", consulta + id, token, null);
                assertThat(atual.getStatus()).isEqualTo(200);
                assertThat(p.c.json(resposta)).isEqualTo(p.c.json(atual));
                assertThat(p.c.json(resposta).get("versao")).isEqualTo(alterado.get("versao"));
                assertThat(p.contar("pedido")).isEqualTo(1);
                assertThat(p.contar("cobranca")).isEqualTo(1);
                assertThat(p.contar("ajuste_cobranca")).isEqualTo(acao.equals("cancelar") ? 2 : 0);
            } finally {
                continuarReplay.countDown();
            }
        }
    }
}
