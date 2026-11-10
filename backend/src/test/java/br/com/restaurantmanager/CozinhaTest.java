package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.UUID;
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
class CozinhaTest {
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
    void quantidadeTresPermiteEstadosDistintosELoteInvalidoNaoAplicaParcialmente() throws Exception {
        var pedido = p.enviar(p.entrada(3));
        List<UUID> ids = p.unidades(pedido);
        assertThat(p.acao(pedido, "iniciar", p.c.token, List.of(ids.getFirst())).getStatus()).isEqualTo(409);
        pedido = p.acao(pedido, "aceitar", List.of());
        pedido = p.acao(pedido, "iniciar", List.of(ids.get(0), ids.get(1)));
        pedido = p.acao(pedido, "concluir", List.of(ids.get(0)));
        assertThat(pedido.get("unidades").get(0).get("estado").asText()).isEqualTo("PRONTO");
        assertThat(pedido.get("unidades").get(1).get("estado").asText()).isEqualTo("EM_PREPARO");
        assertThat(pedido.get("unidades").get(2).get("estado").asText()).isEqualTo("NA_FILA");
        var antes = p.detalhe(pedido);
        assertThat(p.acao(pedido, "concluir", p.c.token, List.of(ids.get(1), ids.get(2))).getStatus()).isEqualTo(409);
        assertThat(p.detalhe(pedido)).isEqualTo(antes);
        pedido = p.acao(pedido, "concluir", List.of(ids.get(1)));
        pedido = p.acao(pedido, "iniciar", List.of(ids.get(2)));
        pedido = p.acao(pedido, "concluir", List.of(ids.get(2)));
        assertThat(pedido.get("estado").asText()).isEqualTo("PRONTO");
        assertThat(p.acao(pedido, "iniciar", p.c.token, List.of(ids.get(0))).getStatus()).isEqualTo(409);
        assertThat(p.detalhe(pedido).get("linhas").get(0).get("quantidade").asInt()).isEqualTo(3);
    }

    @Test
    void iniciarEConcluirRevalidamAcaoEspecificaFilialETenantComMesmoJwt() throws Exception {
        var pedido = p.acao(p.enviar(p.entrada(1)), "aceitar", List.of());
        String cozinha = p.funcionario("COZINHA");
        String caixa = p.funcionario("CAIXA");
        var restrito = p.c.usuario("COZINHA");
        p.c.vincular(restrito, CatalogoCenario.OUTRA_UNIDADE);
        String outraUnidade = p.c.login(restrito);
        p.c.reautenticar();
        for (String acao : List.of("iniciar", "concluir")) {
            var antes = p.detalhe(pedido);
            assertThat(p.acao(pedido, acao, caixa, p.unidades(pedido)).getStatus()).isEqualTo(403);
            assertThat(p.acao(pedido, acao, outraUnidade, p.unidades(pedido)).getStatus()).isEqualTo(404);
            try (var outro = new CatalogoCenario(mvc, mapper)) {
                String rota = "/api/v1/cozinha/pedidos/" + pedido.get("id").asText() + "/" + acao;
                assertThat(outro.enviar("POST", rota, outro.token,
                        p.comando(pedido, p.unidades(pedido))).getStatus()).isEqualTo(404);
            }
            p.c.configurarAcoes("COZINHA", List.of("pedido.consultar"));
            assertThat(p.acao(pedido, acao, cozinha, p.unidades(pedido)).getStatus()).isEqualTo(403);
            assertThat(p.detalhe(pedido)).isEqualTo(antes);
            p.c.configurarAcoes("COZINHA", List.of("cozinha.iniciar", "cozinha.concluir"));
            var resposta = p.acao(pedido, acao, cozinha, p.unidades(pedido));
            assertThat(resposta.getStatus()).isEqualTo(200);
            pedido = p.detalhe(pedido);
        }
        assertThat(pedido.get("estado").asText()).isEqualTo("PRONTO");
    }

    @Test
    void cancelarUnicaIniciadaNaoApagaPrimeiroPreparoNemRestauraAutocancelamento() throws Exception {
        var pedido = p.acao(p.enviar(p.entrada(2)), "aceitar", List.of());
        List<UUID> ids = p.unidades(pedido);
        pedido = p.acao(pedido, "iniciar", List.of(ids.getFirst()));
        var primeiro = pedido.get("primeiroPreparoEm");
        String atendimento = p.funcionario("ATENDIMENTO");
        assertThat(p.acao(pedido, "cancelar", atendimento, List.of(ids.get(1))).getStatus()).isEqualTo(403);
        pedido = p.acao(pedido, "cancelar", List.of(ids.getFirst()));
        assertThat(pedido.get("primeiroPreparoEm")).isEqualTo(primeiro);
        assertThat(pedido.get("estado").asText()).isEqualTo("EM_PREPARO");
        String caminho = "/api/v1/me/pedidos/" + pedido.get("id").asText() + "/cancelar";
        assertThat(p.c.enviar("POST", caminho, p.tokenCliente, p.comando(pedido, List.of())).getStatus()).isEqualTo(409);
        assertThat(p.detalhe(pedido).get("saldo").get("totalDevido").asText()).isEqualTo("20.00");
        pedido = p.acao(pedido, "iniciar", List.of(ids.get(1)));
        assertThat(pedido.get("primeiroPreparoEm")).isEqualTo(primeiro);
    }

    @Test
    void solicitacaoNaoInterrompeProducaoEDecisaoExigePermissaoPosPreparo() throws Exception {
        var pedido = p.acao(p.enviar(p.entrada(2)), "aceitar", List.of());
        pedido = p.acao(pedido, "iniciar", List.of(p.unidades(pedido).getFirst()));
        String id = pedido.get("id").asText();
        var solicitacao = p.c.enviar("POST", "/api/v1/me/pedidos/" + id + "/solicitar-cancelamento", p.tokenCliente, p.comando(pedido, List.of()));
        assertThat(solicitacao.getStatus()).isEqualTo(200);
        pedido = p.c.json(solicitacao);
        assertThat(pedido.get("estado").asText()).isEqualTo("EM_PREPARO");
        String decisao = "/api/v1/operacao/pedidos/" + id + "/solicitacoes/" + pedido.get("solicitacoes").get(0).get("id").asText() + "/aprovar";
        assertThat(p.c.enviar("POST", decisao, p.funcionario("ATENDIMENTO"), p.comando(pedido, List.of())).getStatus()).isEqualTo(403);
        var aprovada = p.c.enviar("POST", decisao, p.c.token, p.comando(pedido, List.of()));
        assertThat(aprovada.getStatus()).isEqualTo(200);
        assertThat(p.c.json(aprovada).get("estado").asText()).isEqualTo("CANCELADO");
        assertThat(p.c.json(aprovada).get("solicitacoes").get(0).get("estado").asText()).isEqualTo("APROVADA");
        assertThat(p.detalhe(pedido).get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
    }

    @Test
    void cancelamentoParcialAntesAceiteNaoLiberaProducaoERetiradaNaoPodeSerServida() throws Exception {
        var pedido = p.enviar(p.entrada(2));
        pedido = p.acao(pedido, "cancelar", List.of(p.unidades(pedido).getFirst()));
        assertThat(pedido.get("estado").asText()).isEqualTo("AGUARDANDO_ACEITE");
        List<UUID> ativas = List.of(p.unidades(pedido).get(1));
        assertThat(p.acao(pedido, "iniciar", p.c.token, ativas).getStatus()).isEqualTo(409);
        pedido = p.acao(pedido, "aceitar", List.of());
        pedido = p.acao(pedido, "iniciar", ativas);
        pedido = p.acao(pedido, "concluir", ativas);
        assertThat(p.acao(pedido, "servir", p.c.token, List.of()).getStatus()).isEqualTo(409);
    }
}
