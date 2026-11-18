package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.OUTRA_UNIDADE;
import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.catalogo.dtos.Adicional;
import br.com.restaurantmanager.catalogo.dtos.Grupo;
import br.com.restaurantmanager.catalogo.dtos.Opcao;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc(print = MockMvcPrint.NONE)
class ListagemCatalogoGestaoTest {
    private static final String LISTAGEM = "/api/v1/gestao/catalogo/listagem";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @Test
    void buscaNoCatalogoInteiroAntesDePaginarEConsultaOfertaRealDaUnidade() throws Exception {
        try (var c = new CatalogoCenario(mvc, mapper)) {
            var categoria = c.categoria("Lanches");
            var item = c.produto(categoria, "Zeta", List.of(), List.of());
            c.executar("insert into " + c.schema + ".produto(id, categoria_id, tipo, nome, descricao, ativo, sugerido, "
                    + "adicionais, grupos, versao, criacao_ator, criacao_payload) select gen_random_uuid(), '"
                    + categoria.id() + "', 'SIMPLES', 'Base ' || n, 'Descrição', true, false, '[]', '[]', 0, '"
                    + c.administrador + "', '{}' from generate_series(1,51) n");
            c.ofertar(item.id(), UNIDADE, "13.40", true);
            c.ofertar(item.id(), OUTRA_UNIDADE, "25.90", false);
            var pagina = c.json(c.enviar("GET", LISTAGEM, c.token, null));
            assertThat(pagina.get("temMais").asBoolean()).isTrue();
            assertThat(pagina.get("itens").size()).isEqualTo(50);
            var filtro = "?busca=zEtA&categoriaId=" + categoria.id() + "&tipo=SIMPLES&ativo=true";
            var resultado = c.json(c.enviar("GET", LISTAGEM + filtro + "&unidadeId=" + UNIDADE + "&disponivel=true", c.token, null));
            assertThat(resultado.get("itens").size()).isEqualTo(1);
            var oferta = resultado.get("itens").get(0).get("oferta");
            assertThat(oferta.get("preco").asText()).isEqualTo("13.40");
            assertThat(oferta.get("canais").size()).isEqualTo(2);
            var indisponivel = c.json(c.enviar("GET", LISTAGEM + filtro + "&unidadeId=" + OUTRA_UNIDADE + "&disponivel=false", c.token, null));
            assertThat(indisponivel.get("itens").get(0).get("oferta").get("preco").asText()).isEqualTo("25.90");
            assertThat(c.enviar("GET", LISTAGEM + "?disponivel=true", c.token, null).getStatus()).isEqualTo(422);
        }
    }

    @Test
    void consultaOperacionalProtegeFilialEDetalhesRestritosNaComposicao() throws Exception {
        try (var c = new CatalogoCenario(mvc, mapper); var outra = new CatalogoCenario(mvc, mapper)) {
            var categoria = c.categoria("Sobremesas");
            var extra = new Adicional(UUID.randomUUID(), "Castanhas", "2.50", 2, true);
            var inativo = new Adicional(UUID.randomUUID(), "Suspenso", "1.00", 1, false);
            var componente = c.produto(categoria, "Sorvete", List.of(extra, inativo), List.of());
            var opcao = new Opcao(UUID.randomUUID(), componente.id(), "0.50", 2, List.of(extra.id()));
            c.produto(categoria, "Combo", List.of(), List.of(new Grupo(UUID.randomUUID(), "Sabores", 1, 2, List.of(opcao))));
            var atendente = c.usuario("ATENDIMENTO");
            c.vincular(atendente, UNIDADE);
            var token = c.login(atendente);
            var resultado = c.enviar("GET", LISTAGEM + "?unidadeId=" + UNIDADE, token, null);
            assertThat(resultado.getStatus()).isEqualTo(200);
            assertThat(resultado.getContentAsString()).doesNotContain("Suspenso");
            var corpo = c.json(resultado);
            assertThat(corpo.get("componentes").get(componente.id().toString()).get("nome").asText()).isEqualTo("Sorvete");
            assertThat(corpo.get("itens").get(0).get("oferta").isNull()).isTrue();
            assertThat(c.enviar("GET", LISTAGEM + "?unidadeId=" + OUTRA_UNIDADE, token, null).getStatus()).isEqualTo(404);
            assertThat(c.enviar("GET", LISTAGEM, token, null).getStatus()).isEqualTo(403);
            assertThat(outra.enviar("GET", LISTAGEM + "?unidadeId=" + UNIDADE, token, null).getStatus()).isEqualTo(401);
            var cliente = c.login(c.usuario("CLIENTE"));
            assertThat(c.enviar("GET", LISTAGEM + "?unidadeId=" + UNIDADE, cliente, null).getStatus()).isEqualTo(403);
            assertThat(c.enviar("GET", LISTAGEM, null, null).getStatus()).isEqualTo(401);
        }
    }
}
