package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.OUTRA_UNIDADE;
import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
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
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class PedidosTest {
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
    void enviaRecalculaSnapshotEDeduplicaMesmoDepoisDeAlterarCatalogo() throws Exception {
        var entrada = p.entrada(3);
        var pedido = p.enviar(entrada);
        assertThat(pedido.get("estado").asText()).isEqualTo("AGUARDANDO_ACEITE");
        assertThat(pedido.get("unidades").size()).isEqualTo(3);
        assertThat(pedido.get("saldo").get("totalDevido").asText()).isEqualTo("60.00");
        p.c.ofertar(p.produto.id(), UNIDADE, "99.00", true);
        assertThat(p.enviar(entrada)).isEqualTo(pedido);
        assertThat(p.contar("pedido")).isEqualTo(1);
        assertThat(p.contar("cobranca")).isEqualTo(1);
        assertThat(p.contar("pedido_historico")).isEqualTo(1);
        assertThat(p.detalhe(pedido).get("linhas").get(0).get("precoUnitario").asText()).isEqualTo("20.00");
        var divergente = new EnviarPedido(entrada.intencaoId(), entrada.unidadeId(), entrada.canal(), null,
                entrada.revisao(), entrada.linhas(), "Outro pedido", null);
        assertThat(p.c.enviar("POST", "/api/v1/pedidos", p.tokenCliente, divergente).getStatus()).isEqualTo(409);
    }

    @Test
    void precoMudouAntesDoEnvioNaoCriaPedidoECamposAdulteradosSaoRecusados() throws Exception {
        var entrada = p.entrada(1);
        p.c.ofertar(p.produto.id(), UNIDADE, "25.00", true);
        assertThat(p.c.enviar("POST", "/api/v1/pedidos", p.tokenCliente, entrada).getStatus()).isEqualTo(409);
        assertThat(p.contar("pedido")).isZero();
        String body = mapper.writeValueAsString(p.entrada(1));
        assertThat(p.c.enviarJson("POST", "/api/v1/pedidos", p.tokenCliente, body.replace("\"observacao\":", "\"total\":\"0.01\",\"observacao\":")).getStatus()).isEqualTo(400);
        assertThat(p.c.enviarJson("POST", "/api/v1/pedidos", p.tokenCliente, body.replace("\"quantidade\":1", "\"quantidade\":1.5")).getStatus()).isEqualTo(400);
    }

    @Test
    void clienteNaoLeOuCancelaPedidoAlheioENaoCriaMesaSemSessao() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        String outro = p.c.login(p.c.usuario("CLIENTE"));
        String id = pedido.get("id").asText();
        assertThat(p.c.enviar("GET", "/api/v1/me/pedidos/" + id, outro, null).getStatus()).isEqualTo(404);
        assertThat(p.c.enviar("POST", "/api/v1/me/pedidos/" + id + "/cancelar", outro, p.comando(pedido, List.of())).getStatus()).isEqualTo(404);
        assertThat(p.c.enviar("GET", "/api/v1/operacao/pedidos?unidadeId=" + UNIDADE, p.tokenCliente, null).getStatus()).isEqualTo(403);
        var mesa = p.entrada(List.of(new Linha(UUID.randomUUID(), p.produto.id(), 1, List.of(), List.of())), CanalAtendimento.MESA, UUID.randomUUID());
        assertThat(p.c.enviar("POST", "/api/v1/pedidos", p.tokenCliente, mesa).getStatus()).isEqualTo(422);
        try (var outra = new PedidosCenario(mvc, mapper)) {
            assertThat(outra.c.enviar("GET", "/api/v1/operacao/pedidos/" + id, outra.c.token, null).getStatus()).isEqualTo(404);
        }
    }

    @Test
    void pedidoAssistidoPreservaAutoriaDoFuncionario() throws Exception {
        var entrada = p.entrada(1);
        var resposta = p.c.enviar("POST", "/api/v1/operacao/pedidos", p.funcionario("ATENDIMENTO"), entrada);
        assertThat(resposta.getStatus()).isEqualTo(200);
        assertThat(p.c.enviar("GET", "/api/v1/me/pedidos/" + entrada.intencaoId(), p.tokenCliente, null).getStatus()).isEqualTo(404);
        assertThat(p.c.json(resposta).has("saldo")).isFalse();
    }

    @Test
    void empresaSuspensaEUnidadeInativaBloqueiamNovasVendasMasPreservamResolucao() throws Exception {
        var entrada = p.entrada(1);
        var pedido = p.enviar(entrada);
        var nova = p.entrada(1);
        p.c.executar("update public.empresa set estado='SUSPENSO' where id='" + p.c.empresa + "'");
        assertThat(p.c.enviar("POST", "/api/v1/pedidos", p.tokenCliente, nova).getStatus()).isEqualTo(409);
        assertThat(p.enviar(entrada).get("id").asText()).isEqualTo(pedido.get("id").asText());
        pedido = p.acao(pedido, "aceitar", List.of());
        p.c.executar("update " + p.c.schema + ".unidade set ativa=false where id='" + UNIDADE + "'");
        var cancelado = p.c.enviar("POST", "/api/v1/me/pedidos/" + pedido.get("id").asText() + "/cancelar", p.tokenCliente, p.comando(pedido, List.of()));
        assertThat(cancelado.getStatus()).isEqualTo(200);
        assertThat(p.c.json(cancelado).get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
    }

    @Test
    void acoesExigemUnidadeEPermissaoAtuaisMesmoComJwtValido() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        String atendimento = p.funcionario("ATENDIMENTO");
        UUID restrito = p.c.usuario("ATENDIMENTO");
        p.c.vincular(restrito, OUTRA_UNIDADE);
        String outraUnidade = p.c.login(restrito);
        assertThat(p.acao(pedido, "aceitar", outraUnidade, List.of()).getStatus()).isEqualTo(404);
        p.c.executar("delete from " + p.c.schema + ".permissao_perfil where perfil='ATENDIMENTO' and acao='pedido.aceitar'");
        assertThat(p.acao(pedido, "aceitar", atendimento, List.of()).getStatus()).isEqualTo(403);
        assertThat(p.detalhe(pedido).get("estado").asText()).isEqualTo("AGUARDANDO_ACEITE");
    }

    @Test
    void recusaEhTerminalAjustaValorENaoDuplicaComando() throws Exception {
        var pedido = p.enviar(p.entrada(2));
        var comando = p.comando(pedido, List.of());
        String caminho = "/api/v1/operacao/pedidos/" + pedido.get("id").asText() + "/recusar";
        var primeira = p.c.enviar("POST", caminho, p.c.token, comando);
        var repetida = p.c.enviar("POST", caminho, p.c.token, comando);
        assertThat(primeira.getStatus()).isEqualTo(200);
        assertThat(p.c.json(repetida)).isEqualTo(p.c.json(primeira));
        assertThat(p.contar("ajuste_cobranca")).isEqualTo(2);
        assertThat(p.detalhe(pedido).get("saldo").get("totalDevido").asText()).isEqualTo("0.00");
        var novo = p.c.json(primeira);
        assertThat(p.acao(novo, "aceitar", p.c.token, List.of()).getStatus()).isEqualTo(409);
        assertThat(p.acao(novo, "iniciar", p.c.token, p.unidades(novo)).getStatus()).isEqualTo(409);
    }

    @Test
    void deliveryControladoPreservaEnderecoPrivadoSemExporAoKds() throws Exception {
        var entrada = p.entrada(List.of(new Linha(UUID.randomUUID(), p.produto.id(), 1, List.of(), List.of())), CanalAtendimento.DELIVERY, null);
        var pedido = p.enviar(entrada);
        assertThat(pedido.get("saldo").get("totalDevido").asText()).isEqualTo("20.00");
        pedido = p.acao(pedido, "aceitar", List.of());
        var resposta = p.c.enviar("GET", "/api/v1/cozinha?unidadeId=" + UNIDADE, p.funcionario("COZINHA"), null);
        assertThat(resposta.getStatus()).isEqualTo(200);
        String json = resposta.getContentAsString();
        assertThat(json).doesNotContain("logradouro", "endereco", "preco", "saldo", "total", "@example.invalid");
        assertThat(json).contains("Sem cebola", "Hambúrguer");
    }

    @Test
    void prazosSaoVersionadosEHerdadosSemReescreverPedidoExistente() throws Exception {
        var pedido = p.enviar(p.entrada(1));
        p.c.executar("update " + p.c.schema + ".sessao set reautenticada_em=now() where usuario_id='" + p.c.administrador + "'");
        var alteracao = Map.of("versao", 0, "alertaSegundos", 60, "expiracaoSegundos", 180, "herdar", false);
        assertThat(p.c.enviar("PUT", "/api/v1/configuracoes/prazos-aceite", p.c.token, alteracao).getStatus()).isEqualTo(200);
        assertThat(p.c.enviar("PUT", "/api/v1/configuracoes/prazos-aceite", p.c.token, alteracao).getStatus()).isEqualTo(409);
        var herdado = p.c.json(p.c.enviar("GET", "/api/v1/configuracoes/unidades/" + UNIDADE + "/prazos-aceite", p.c.token, null));
        assertThat(herdado.get("herdado").asBoolean()).isTrue();
        assertThat(herdado.get("alertaSegundos").asInt()).isEqualTo(60);
        assertThat(p.detalhe(pedido).get("expirarEm")).isEqualTo(pedido.get("expirarEm"));
        var invalido = Map.of("versao", 1, "alertaSegundos", 200, "expiracaoSegundos", 180, "herdar", false);
        assertThat(p.c.enviar("PUT", "/api/v1/configuracoes/prazos-aceite", p.c.token, invalido).getStatus()).isEqualTo(422);
    }
}
