package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.delivery.dtos.ConfigDelivery;
import br.com.restaurantmanager.delivery.dtos.OrcamentarEntrega;
import br.com.restaurantmanager.delivery.dtos.RegiaoDelivery;
import br.com.restaurantmanager.pedidos.dtos.EnderecoEntrega;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import tools.jackson.databind.ObjectMapper;

import java.util.List;
import java.util.UUID;

@SpringBootTest(properties = "rm.stage=test")
@AutoConfigureMockMvc
class DeliveryTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private PedidosCenario p;
    private String config;

    @BeforeAll
    static void banco() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void cenario() throws Exception {
        p = new PedidosCenario(mvc, mapper);
        config = "/api/v1/configuracoes/unidades/" + UNIDADE + "/delivery";
        p.c.executar(
                "update "
                        + p.c.schema
                        + ".sessao set reautenticada_em=now() where usuario_id='"
                        + p.c.administrador
                        + "'");
    }

    @AfterEach
    void limpar() throws Exception {
        p.close();
    }

    private RegiaoDelivery regiao(String inicio, String fim, String taxa, String minimo) {
        return new RegiaoDelivery(UUID.randomUUID(), "Centro", inicio, fim, taxa, minimo, true);
    }

    @Test
    void configuraComVersaoReautenticacaoESemSobreposicao() throws Exception {
        var regiao = regiao("01000000", "01999999", "5.00", "20.00");
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        config,
                                        p.c.token,
                                        new ConfigDelivery(0, 900, List.of(regiao)))
                                .getStatus())
                .isEqualTo(200);
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        config,
                                        p.c.token,
                                        new ConfigDelivery(0, 900, List.of(regiao)))
                                .getStatus())
                .isEqualTo(409);
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        config,
                                        p.c.token,
                                        new ConfigDelivery(
                                                1,
                                                900,
                                                List.of(
                                                        regiao,
                                                        regiao("01999999", "02000000", "1", "0"))))
                                .getStatus())
                .isEqualTo(422);
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        config,
                                        p.tokenCliente,
                                        new ConfigDelivery(1, 900, List.of(regiao)))
                                .getStatus())
                .isEqualTo(403);
        p.c.executar("update " + p.c.schema + ".sessao set reautenticada_em=null");
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        config,
                                        p.c.token,
                                        new ConfigDelivery(1, 900, List.of(regiao)))
                                .getStatus())
                .isEqualTo(403);
    }

    @Test
    void validaCepMinimoERevisaoNaApiEPreservaSnapshot() throws Exception {
        var regiao = regiao("01000000", "01999999", "5.00", "20.00");
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        config,
                                        p.c.token,
                                        new ConfigDelivery(0, 900, List.of(regiao)))
                                .getStatus())
                .isEqualTo(200);
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        "/api/v1/delivery/orcamento",
                                        null,
                                        new OrcamentarEntrega(UNIDADE, "02000000", "20.00"))
                                .getStatus())
                .isEqualTo(422);
        assertThat(
                        p.c.enviar(
                                        "POST",
                                        "/api/v1/delivery/orcamento",
                                        null,
                                        new OrcamentarEntrega(UNIDADE, "01000000", "19.99"))
                                .getStatus())
                .isEqualTo(422);
        var antiga =
                p.entrada(
                        List.of(
                                new Linha(
                                        UUID.randomUUID(),
                                        p.produto.id(),
                                        1,
                                        List.of(),
                                        List.of())),
                        CanalAtendimento.DELIVERY,
                        null);
        var e = antiga.endereco();
        var entrada =
                new EnviarPedido(
                        antiga.intencaoId(),
                        antiga.unidadeId(),
                        antiga.canal(),
                        null,
                        antiga.revisao(),
                        antiga.linhas(),
                        antiga.observacao(),
                        new EnderecoEntrega(
                                e.logradouro(),
                                e.numero(),
                                e.complemento(),
                                e.bairro(),
                                e.cidade(),
                                e.uf(),
                                e.cep(),
                                "Cliente fictício",
                                "11999999999"));
        assertThat(p.c.enviar("POST", "/api/v1/pedidos", p.tokenCliente, entrada).getStatus())
                .isEqualTo(409);
        var quote =
                p.c.enviar(
                        "POST",
                        "/api/v1/delivery/orcamento",
                        null,
                        new OrcamentarEntrega(UNIDADE, entrada.endereco().cep(), "20.00"));
        assertThat(quote.getStatus()).isEqualTo(200);
        var confirmado =
                new EnviarPedido(
                        entrada.intencaoId(),
                        entrada.unidadeId(),
                        entrada.canal(),
                        null,
                        entrada.revisao(),
                        entrada.linhas(),
                        entrada.observacao(),
                        entrada.endereco(),
                        p.c.json(quote).get("revisao").asText());
        var pedido = p.enviar(confirmado);
        assertThat(pedido.get("saldo").get("totalDevido").asText()).isEqualTo("25.00");
        assertThat(pedido.get("entrega").get("taxa").asText()).isEqualTo("5.00");
        var nova =
                new RegiaoDelivery(
                        regiao.id(),
                        regiao.nome(),
                        regiao.cepInicial(),
                        regiao.cepFinal(),
                        "10.00",
                        "20.00",
                        true);
        assertThat(
                        p.c.enviar(
                                        "PUT",
                                        config,
                                        p.c.token,
                                        new ConfigDelivery(1, 900, List.of(nova)))
                                .getStatus())
                .isEqualTo(200);
        assertThat(p.detalhe(pedido).get("entrega").get("taxa").asText()).isEqualTo("5.00");
        // A mesma intenção recupera o pedido original sem reaplicar taxa nova.
        assertThat(p.enviar(confirmado).get("saldo").get("totalDevido").asText())
                .isEqualTo("25.00");
    }
}
