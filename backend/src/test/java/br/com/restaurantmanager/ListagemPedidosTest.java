package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.OUTRA_UNIDADE;
import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.util.ArrayList;
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
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(properties = {"rm.stage=test", "rm.pedidos.delivery-controlado=true"})
@AutoConfigureMockMvc
class ListagemPedidosTest {
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
    void filtraAntesDaPaginacaoMantendoOrdenacaoPadraoEPaginasSemSobreposicao() throws Exception {
        var retirada = p.acao(p.enviar(p.entrada(1)), "aceitar", List.of());
        var delivery = p.enviar(p.entrada(List.of(new Linha(UUID.randomUUID(), p.produto.id(), 1, List.of(), List.of())),
                CanalAtendimento.DELIVERY, null));
        delivery = p.acao(delivery, "recusar", List.of());
        replicar(retirada, "2000-01-01");
        replicar(delivery, "2001-01-01");

        var padrao = listar("/api/v1/operacao/pedidos", "");
        assertThat(padrao.get("itens").size()).isEqualTo(50);
        assertThat(padrao.get("mais").asBoolean()).isTrue();
        assertThat(estados(padrao)).containsOnly("CANCELADO");
        assertThat(listar("/api/v1/operacao/pedidos", "&ordenacao=RECENTES")).isEqualTo(padrao);

        String filtro = "&estados=NA_FILA,CANCELADO&canal=RETIRADA&ordenacao=ANTIGOS";
        var primeira = listar("/api/v1/operacao/pedidos", filtro);
        var segunda = listar("/api/v1/operacao/pedidos", filtro + "&pagina=1");
        assertThat(primeira.get("itens").size()).isEqualTo(50);
        assertThat(primeira.get("mais").asBoolean()).isTrue();
        assertThat(primeira.get("itens").get(0).get("id").asText()).isEqualTo(retirada.get("id").asText());
        assertThat(estados(primeira)).containsOnly("NA_FILA");
        assertThat(segunda.get("itens").size()).isEqualTo(2);
        assertThat(segunda.get("mais").asBoolean()).isFalse();
        var ids = ids(primeira);
        ids.addAll(ids(segunda));
        assertThat(ids).hasSize(52).doesNotHaveDuplicates();
        assertThat(listar("/api/v1/operacao/pedidos", "&estados=NA_FILA&ordenacao=ANTIGOS")).isEqualTo(primeira);
        var recentes = listar("/api/v1/operacao/pedidos", "&estados=NA_FILA&pagina=1");
        assertThat(recentes.get("itens").get(1).get("id").asText()).isEqualTo(retirada.get("id").asText());

        var cozinha = listar("/api/v1/cozinha", filtro);
        assertThat(cozinha).isEqualTo(primeira);
        assertThat(listar("/api/v1/cozinha", filtro + "&pagina=1")).isEqualTo(segunda);
        assertThat(listar("/api/v1/cozinha", "&estados=CANCELADO").get("itens").isEmpty()).isTrue();
        assertThat(listar("/api/v1/cozinha", "&canal=DELIVERY").get("itens").isEmpty()).isTrue();
        assertThat(listar("/api/v1/operacao/pedidos", "&canal=MESA").get("itens").isEmpty()).isTrue();
    }

    @Test
    void filtrosNaoAmpliamPermissoesEValoresDesconhecidosSaoRecusados() throws Exception {
        String cozinha = p.funcionario("COZINHA");
        for (String endpoint : List.of("/api/v1/operacao/pedidos", "/api/v1/cozinha")) {
            String caminho = endpoint + "?unidadeId=" + UNIDADE;
            assertThat(p.c.enviar("GET", caminho + "&estados=PRONTO", null, null).getStatus()).isEqualTo(401);
            assertThat(p.c.enviar("GET", caminho + "&estados=PRONTO", p.tokenCliente, null).getStatus()).isEqualTo(403);
            assertThat(p.c.enviar("GET", endpoint + "?unidadeId=" + OUTRA_UNIDADE + "&estados=PRONTO", cozinha, null)
                    .getStatus()).isEqualTo(404);
            for (String invalido : List.of("&estados=INEXISTENTE", "&estados=1", "&canal=INEXISTENTE", "&ordenacao=criado_em")) {
                assertThat(p.c.enviar("GET", caminho + invalido, p.c.token, null).getStatus()).isEqualTo(400);
            }
            assertThat(listar(endpoint, "&estados=").get("itens").isEmpty()).isTrue();
        }
    }

    private JsonNode listar(String endpoint, String filtro) throws Exception {
        var resposta = p.c.enviar("GET", endpoint + "?unidadeId=" + UNIDADE + filtro, p.c.token, null);
        assertThat(resposta.getStatus()).as(resposta.getContentAsString()).isEqualTo(200);
        return p.c.json(resposta);
    }

    private List<String> ids(JsonNode pagina) {
        var valores = new ArrayList<String>();
        pagina.get("itens").forEach(item -> valores.add(item.get("id").asText()));
        return valores;
    }

    private List<String> estados(JsonNode pagina) {
        var valores = new ArrayList<String>();
        pagina.get("itens").forEach(item -> valores.add(item.get("estado").asText()));
        return valores;
    }

    private void replicar(JsonNode pedido, String inicio) throws Exception {
        String tabela = p.c.schema + ".pedido";
        String id = pedido.get("id").asText();
        p.c.executar("update " + tabela + " set criado_em='" + inicio + "' where id='" + id + "'");
        p.c.executar("insert into " + tabela + "(id,unidade_id,usuario_id,autoria,canal,estado,criado_em,alertar_em,"
                + "expirar_em,observacao,linhas,endereco,payload) select gen_random_uuid(),unidade_id,usuario_id,autoria,"
                + "canal,estado,criado_em+n*interval '1 second',alertar_em,expirar_em,observacao,linhas,endereco,payload from "
                + tabela + " cross join generate_series(1,51) n where id='" + id + "'");
    }
}
