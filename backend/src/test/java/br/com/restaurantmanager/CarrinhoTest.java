package br.com.restaurantmanager;

import static br.com.restaurantmanager.CatalogoCenario.OUTRA_UNIDADE;
import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;
import static org.assertj.core.api.Assertions.assertThat;

import br.com.restaurantmanager.carrinho.dtos.Calcular;
import br.com.restaurantmanager.carrinho.dtos.Escolha;
import br.com.restaurantmanager.carrinho.dtos.Linha;
import br.com.restaurantmanager.carrinho.dtos.SelecaoAdicional;
import br.com.restaurantmanager.catalogo.dtos.Adicional;
import br.com.restaurantmanager.catalogo.dtos.Grupo;
import br.com.restaurantmanager.catalogo.dtos.Opcao;
import br.com.restaurantmanager.catalogo.dtos.Produto;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class CarrinhoTest {
    private static final String CALCULAR = "/api/v1/carrinho/calcular";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private CatalogoCenario c;
    private Produto componente;
    private Produto alternativa;
    private Produto combo;
    private UUID adicional;
    private UUID grupo;
    private UUID opcao;
    private UUID opcaoAlternativa;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void massaPropria() throws Exception {
        c = new CatalogoCenario(mvc, mapper);
        var categoria = c.categoria("Combos");
        adicional = UUID.randomUUID();
        componente = c.produto(categoria, "Hambúrguer", List.of(new Adicional(adicional, "Queijo", "3.00", 2, true)), List.of());
        alternativa = c.produto(categoria, "Vegetariano", List.of(), List.of());
        grupo = UUID.randomUUID();
        opcao = UUID.randomUUID();
        opcaoAlternativa = UUID.randomUUID();
        var escolhas = new Grupo(grupo, "Escolha seu lanche", 1, 2, List.of(
                new Opcao(opcao, componente.id(), "5.00", 2, List.of(adicional)),
                new Opcao(opcaoAlternativa, alternativa.id(), "2.00", 1, List.of())));
        combo = c.produto(categoria, "Combo da casa", List.of(), List.of(escolhas));
        c.ofertar(componente.id(), UNIDADE, "100.00", true);
        c.ofertar(alternativa.id(), UNIDADE, "200.00", true);
        c.ofertar(combo.id(), UNIDADE, "30.00", true);
        c.abrir(UNIDADE);
    }

    @AfterEach
    void limparMassaPropria() throws Exception {
        c.close();
    }

    @Test
    void recalculoUsaSomentePrecosDoServidorEGeraSnapshotCompletoDoCombo() throws Exception {
        var linha = linha(2, List.of(escolha(1, true), new Escolha(grupo, opcaoAlternativa, 1, List.of())));
        var resposta = calcular(List.of(linha), null);

        assertThat(resposta.getStatus()).isEqualTo(200);
        var resumo = c.json(resposta);
        assertThat(resumo.get("total").asText()).isEqualTo("80.00");
        assertThat(resumo.get("subtotal").asText()).isEqualTo("80.00");
        assertThat(resumo.get("moeda").asText()).isEqualTo("BRL");
        assertThat(resumo.get("requerConfirmacao").asBoolean()).isTrue();
        var snapshot = resumo.get("linhas").get(0);
        assertThat(snapshot.get("nome").asText()).isEqualTo("Combo da casa");
        assertThat(snapshot.get("precoBase").asText()).isEqualTo("30.00");
        assertThat(snapshot.get("precoUnitario").asText()).isEqualTo("40.00");
        assertThat(snapshot.get("escolhas").size()).isEqualTo(2);
        assertThat(snapshot.get("escolhas").get(0).get("grupo").asText()).isEqualTo("Escolha seu lanche");
        assertThat(snapshot.get("escolhas").get(0).get("nome").asText()).isEqualTo("Hambúrguer");
        assertThat(snapshot.get("escolhas").get(0).get("adicionais").get(0).get("nome").asText()).isEqualTo("Queijo");
        assertThat(c.json(calcular(List.of(linha), resumo.get("revisao").asText())).get("requerConfirmacao").asBoolean()).isFalse();
    }

    @Test
    void quantidadeDeOpcaoMultiplicaAcrescimosSemSomarPrecoAvulsoEConfigsContinuamSeparadas() throws Exception {
        var repetida = linha(2, List.of(escolha(2, true)));
        var separada = linha(1, List.of(escolha(1, true), escolha(1, false)));
        var resposta = c.json(calcular(List.of(repetida, separada), null));

        assertThat(resposta.get("total").asText()).isEqualTo("135.00");
        assertThat(resposta.get("linhas").size()).isEqualTo(2);
        assertThat(resposta.get("linhas").get(0).get("precoUnitario").asText()).isEqualTo("46.00");
        assertThat(resposta.get("linhas").get(1).get("precoUnitario").asText()).isEqualTo("43.00");
        assertThat(resposta.get("linhas").get(1).get("escolhas").size()).isEqualTo(2);
        assertThat(calcular(List.of(repetida, repetida), null).getStatus()).isEqualTo(422);
    }

    @Test
    void precoConfiguracaoQuantidadeEFuncionamentoAlteradosExigemNovaConfirmacao() throws Exception {
        var linha = linha(1, List.of(escolha(1, true)));
        var inicial = c.json(calcular(List.of(linha), null));
        String revisao = inicial.get("revisao").asText();
        assertThat(c.json(calcular(List.of(linha), revisao)).get("requerConfirmacao").asBoolean()).isFalse();

        c.ofertar(combo.id(), UNIDADE, "31.00", true);
        var novo = c.json(calcular(List.of(linha), revisao));
        assertThat(novo.get("total").asText()).isEqualTo("39.00");
        assertThat(novo.get("requerConfirmacao").asBoolean()).isTrue();
        assertThat(inicial.get("total").asText()).isEqualTo("38.00");
        revisao = novo.get("revisao").asText();
        assertThat(c.json(calcular(List.of(linha), revisao)).get("requerConfirmacao").asBoolean()).isFalse();
        var quantidadeAlterada = new Linha(linha.id(), linha.produtoId(), 2, linha.adicionais(), linha.escolhas());
        assertThat(c.json(calcular(List.of(quantidadeAlterada), revisao)).get("requerConfirmacao").asBoolean()).isTrue();

        c.executar("update " + c.schema + ".funcionamento_unidade set versao=versao+1 where unidade_id='" + UNIDADE + "'");
        assertThat(c.json(calcular(List.of(linha), revisao)).get("requerConfirmacao").asBoolean()).isTrue();
        c.executar("update " + c.schema + ".funcionamento_unidade set delivery=false,versao=versao+1 where unidade_id='" + UNIDADE + "'");
        assertThat(calcular(List.of(linha), revisao).getStatus()).isEqualTo(422);
    }

    @Test
    void opcaoIndisponivelPermiteAlternativaMasNuncaSubstituicaoSilenciosa() throws Exception {
        c.ofertar(componente.id(), UNIDADE, "100.00", false);
        var detalhe = c.json(c.enviar("GET", c.publico(combo.id()), null, null));
        assertThat(detalhe.get("disponivel").asBoolean()).isTrue();
        assertThat(detalhe.get("grupos").get(0).get("opcoes").get(0).get("disponivel").asBoolean()).isFalse();
        assertThat(calcular(List.of(linha(1, List.of(escolha(1, true)))), null).getStatus()).isEqualTo(422);

        var explicita = linha(1, List.of(new Escolha(grupo, opcaoAlternativa, 1, List.of())));
        assertThat(c.json(calcular(List.of(explicita), null)).get("total").asText()).isEqualTo("32.00");
        c.ofertar(alternativa.id(), UNIDADE, "200.00", false);
        assertThat(c.json(c.enviar("GET", c.publico(combo.id()), null, null)).get("disponivel").asBoolean()).isFalse();
        assertThat(calcular(List.of(explicita), null).getStatus()).isEqualTo(422);
    }

    @Test
    void manipulacaoDePrecoQuantidadesCamposEReferenciasNaoPassaPeloContrato() throws Exception {
        var linha = linha(1, List.of(escolha(1, true)));
        var body = new Calcular(UNIDADE, CanalAtendimento.DELIVERY, List.of(linha), null);
        String json = mapper.writeValueAsString(body);
        assertThat(c.enviarJson("POST", CALCULAR, null, json.replace("\"quantidade\":1", "\"quantidade\":1.5")).getStatus()).isEqualTo(400);
        assertThat(c.enviarJson("POST", CALCULAR, null, json.replace("\"produtoId\":", "\"preco\":\"0.01\",\"produtoId\":")).getStatus()).isEqualTo(400);
        assertThat(c.enviarJson("POST", CALCULAR, null, json.replace("\"canal\":\"DELIVERY\"", "\"canal\":0")).getStatus()).isEqualTo(400);
        assertThat(calcular(List.of(linha(1, List.of())), null).getStatus()).isEqualTo(422);
        assertThat(calcular(List.of(linha(1, List.of(escolha(2, false), escolha(1, false)))), null).getStatus()).isEqualTo(422);
        assertThat(calcular(List.of(linha(1, List.of(new Escolha(grupo, opcao, 1,
                List.of(new SelecaoAdicional(adicional, 3)))))), null).getStatus()).isEqualTo(422);
        assertThat(calcular(List.of(linha(1, List.of(new Escolha(grupo, opcaoAlternativa, 1,
                List.of(new SelecaoAdicional(adicional, 1)))))), null).getStatus()).isEqualTo(404);
        var alheio = new Linha(UUID.randomUUID(), UUID.randomUUID(), 1, List.of(), List.of());
        assertThat(calcular(List.of(alheio), null).getStatus()).isEqualTo(404);
    }

    @Test
    void unidadeCanalEHorarioSaoRevalidadosEmboraCatalogoFechadoContinueNavegavel() throws Exception {
        var linha = linha(1, List.of(escolha(1, false)));
        var retirada = new Calcular(UNIDADE, CanalAtendimento.RETIRADA, List.of(linha), null);
        assertThat(c.enviar("POST", CALCULAR, null, retirada).getStatus()).isEqualTo(422);
        var outra = new Calcular(OUTRA_UNIDADE, CanalAtendimento.DELIVERY, List.of(linha), null);
        assertThat(c.enviar("POST", CALCULAR, null, outra).getStatus()).isEqualTo(422);
        c.abrir(OUTRA_UNIDADE);
        assertThat(c.enviar("POST", CALCULAR, null, outra).getStatus()).isEqualTo(422);
        c.executar("delete from " + c.schema + ".horario_unidade where unidade_id='" + UNIDADE + "'");
        var vitrine = c.json(c.enviar("GET", "/api/v1/catalogo?unidadeId=" + UNIDADE + "&canal=DELIVERY", null, null));
        assertThat(vitrine.get("aberto").asBoolean()).isFalse();
        assertThat(vitrine.get("itens").size()).isEqualTo(3);
        assertThat(calcular(List.of(linha), null).getStatus()).isEqualTo(422);
    }

    @Test
    void catalogoEQuoteNaoExibemAlteracoesNaoConfirmadasDaTransacao() throws Exception {
        var linha = linha(1, List.of(escolha(1, true)));
        try (var conexao = c.banco()) {
            conexao.setAutoCommit(false);
            try (var sql = conexao.createStatement()) {
                sql.execute("update " + c.schema + ".produto_unidade set preco=50,versao=versao+1 where produto_id='" + combo.id() + "'");
                sql.execute("update " + c.schema + ".produto set nome='Outro nome',versao=versao+1 where id='" + combo.id() + "'");
                sql.execute("update " + c.schema + ".catalogo_revisao set versao=versao+1 where id=1");
            }
            var antes = c.json(calcular(List.of(linha), null));
            assertThat(antes.get("total").asText()).isEqualTo("38.00");
            assertThat(antes.get("linhas").get(0).get("nome").asText()).isEqualTo("Combo da casa");
            conexao.commit();
        }
        var depois = c.json(calcular(List.of(linha), null));
        assertThat(depois.get("total").asText()).isEqualTo("58.00");
        assertThat(depois.get("linhas").get(0).get("nome").asText()).isEqualTo("Outro nome");
    }

    private Escolha escolha(int quantidade, boolean comAdicional) {
        return new Escolha(grupo, opcao, quantidade, comAdicional ? List.of(new SelecaoAdicional(adicional, 1)) : List.of());
    }

    private Linha linha(int quantidade, List<Escolha> escolhas) {
        return new Linha(UUID.randomUUID(), combo.id(), quantidade, List.of(), escolhas);
    }

    private MockHttpServletResponse calcular(List<Linha> linhas, String revisao) throws Exception {
        return c.enviar("POST", CALCULAR, null, new Calcular(UNIDADE, CanalAtendimento.DELIVERY, linhas, revisao));
    }
}
