package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Calcular;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.catalogo.dtos.Produto;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.EnderecoEntrega;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.sql.Connection;
import java.util.List;
import java.util.UUID;
import java.util.stream.IntStream;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

final class PedidosCenario implements AutoCloseable {
    final CatalogoCenario c;
    final Produto produto;
    final UUID cliente;
    final String tokenCliente;

    PedidosCenario(MockMvc mvc, ObjectMapper mapper) throws Exception {
        c = new CatalogoCenario(mvc, mapper);
        var categoria = c.categoria("Pedidos fictícios");
        produto = c.produto(categoria, "Hambúrguer", List.of(), List.of());
        c.ofertar(produto.id(), UNIDADE, "20.00", true);
        c.abrir(UNIDADE);
        c.executar("update " + c.schema + ".funcionamento_unidade set retirada=true,mesa=true");
        c.executar("update " + c.schema + ".produto_unidade set mesa=true");
        c.executar("insert into " + c.schema + ".horario_unidade(unidade_id,canal,dia_semana,inicio_minuto,fim_minuto) select '"
                + UNIDADE + "',canal,dia,0,1440 from generate_series(1,7) dia cross join (values ('RETIRADA'),('MESA')) canais(canal)");
        cliente = c.usuario("CLIENTE");
        tokenCliente = c.login(cliente);
    }

    EnviarPedido entrada(int quantidade) throws Exception {
        return entrada(List.of(new Linha(UUID.randomUUID(), produto.id(), quantidade, List.of(), List.of())), CanalAtendimento.RETIRADA, null);
    }

    EnviarPedido entrada(List<Linha> linhas, CanalAtendimento canal, UUID comanda) throws Exception {
        var resposta = c.enviar("POST", "/api/v1/carrinho/calcular", null, new Calcular(UNIDADE, canal, linhas, null));
        assertThat(resposta.getStatus()).isEqualTo(200);
        return new EnviarPedido(UUID.randomUUID(), UNIDADE, canal, comanda, c.json(resposta).get("revisao").asText(),
                linhas, "Sem cebola", canal == CanalAtendimento.DELIVERY
                        ? new EnderecoEntrega("Rua fictícia", "1", "", "Centro", "Cidade fictícia", "SP", "01000000") : null);
    }

    JsonNode enviar(EnviarPedido entrada) throws Exception {
        var resposta = c.enviar("POST", "/api/v1/pedidos", tokenCliente, entrada);
        assertThat(resposta.getStatus()).as(resposta.getContentAsString()).isEqualTo(200);
        return c.json(resposta);
    }

    JsonNode detalhe(UUID id) throws Exception {
        var resposta = c.enviar("GET", "/api/v1/me/pedidos/" + id, tokenCliente, null);
        assertThat(resposta.getStatus()).as(resposta.getContentAsString()).isEqualTo(200);
        return c.json(resposta);
    }

    JsonNode detalhe(JsonNode pedido) throws Exception {
        return detalhe(UUID.fromString(pedido.get("id").asText()));
    }

    MockHttpServletResponse acao(JsonNode pedido, String acao, String token, List<UUID> unidades) throws Exception {
        String base = acao.equals("iniciar") || acao.equals("concluir") ? "/api/v1/cozinha/pedidos/" : "/api/v1/operacao/pedidos/";
        return c.enviar("POST", base + pedido.get("id").asText() + "/" + acao, token,
                comando(pedido, unidades));
    }

    JsonNode acao(JsonNode pedido, String acao, List<UUID> unidades) throws Exception {
        var resposta = acao(pedido, acao, c.token, unidades);
        assertThat(resposta.getStatus()).as(resposta.getContentAsString()).isEqualTo(200);
        return c.json(resposta);
    }

    ComandoPedido comando(JsonNode pedido, List<UUID> unidades) {
        return new ComandoPedido(UUID.randomUUID(), pedido.get("versao").asLong(), "Motivo fictício", unidades);
    }

    List<UUID> unidades(JsonNode pedido) {
        return IntStream.range(0, pedido.get("unidades").size())
                .mapToObj(i -> UUID.fromString(pedido.get("unidades").get(i).get("id").asText())).toList();
    }

    String funcionario(String perfil) throws Exception {
        UUID usuario = c.usuario(perfil);
        c.vincular(usuario, UNIDADE);
        return c.login(usuario);
    }

    long contar(String tabela) throws Exception {
        return c.contar(tabela);
    }

    Connection banco() throws Exception {
        return c.banco();
    }

    @Override
    public void close() throws Exception {
        c.close();
    }
}
