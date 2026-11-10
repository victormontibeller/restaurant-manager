package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.tenancy.context.TenantScope;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import tools.jackson.databind.ObjectMapper;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/** Expectativas literais de docs/11; não derivadas da política ou do seed testado. */
@SpringBootTest(properties = "rm.stage=test")
@AutoConfigureMockMvc
class MatrizAcoesTest {
    private static final Set<String> EMPRESARIAIS = Set.of("catalogo.editar", "auditoria.consultar");
    private static final Set<String> CATALOGO = Set.of(
            "unidade.acompanhar", "catalogo.consultar", "catalogo.editar", "catalogo.alterar_unidade",
            "pedido.consultar", "pedido.criar_assistido", "pedido.aceitar", "pedido.recusar",
            "cozinha.iniciar", "cozinha.concluir", "pedido.servir", "pedido.retirar", "pedido.despachar",
            "pedido.entregar", "entrega.registrar_ocorrencia", "entrega.decidir_ocorrencia",
            "pedido.cancelar_antes_preparo", "pedido.cancelar_apos_preparo", "mesa.atender",
            "comanda.iniciar_fechamento", "comanda.reabrir", "recebimento.registrar", "comanda.concluir",
            "financeiro.ajustar", "devolucao.solicitar", "pagamento.reconciliar", "relatorio.consultar",
            "auditoria.consultar");
    private static final Set<String> SEM_DEPENDENCIA = Set.of(
            "unidade.acompanhar", "catalogo.consultar", "pedido.consultar", "relatorio.consultar", "auditoria.consultar");
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired AcessosService acessos;
    @Autowired PlatformTransactionManager transactions;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @ParameterizedTest
    @ValueSource(strings = {"GERENTE", "ATENDIMENTO", "CAIXA", "COZINHA", "EXPEDICAO"})
    void cadaAcaoDelegavelConcedeRevogaEIncluiSomenteDependenciaComMesmoJwt(String perfil) throws Exception {
        try (var c = new CatalogoCenario(mvc, mapper); var outro = new CatalogoCenario(mvc, mapper)) {
            UUID usuario = c.usuario(perfil);
            c.vincular(usuario, CatalogoCenario.UNIDADE);
            String token = c.login(usuario);
            var ator = mapper.readValue(c.enviar("GET", "/api/v1/auth/me", token, null).getContentAsByteArray(), IdentidadeAtual.class);
            c.reautenticar();
            for (String codigo : CATALOGO.stream().sorted().toList()) {
                c.configurarAcoes(perfil, List.of(codigo));
                var esperadas = new HashSet<>(Set.of(codigo));
                if (!SEM_DEPENDENCIA.contains(codigo)) {
                    esperadas.add(codigo.startsWith("catalogo.") ? "catalogo.consultar" : "pedido.consultar");
                }
                assertThat(acoesEfetivas(c, token)).as(perfil + " / " + codigo).isEqualTo(esperadas);
                UUID unidade = EMPRESARIAIS.contains(codigo) ? null : CatalogoCenario.UNIDADE;
                autorizar(c.schema, ator, codigo, unidade);
                negar(outro.schema, ator, codigo, unidade, 401);
                if (unidade != null) negar(c.schema, ator, codigo, CatalogoCenario.OUTRA_UNIDADE, 404);
                assertThat(c.enviar("GET", "/api/v1/configuracoes/acessos", token, null).getStatus()).isEqualTo(403);
                assertThat(c.enviar("GET", "/api/v1/equipe", token, null).getStatus()).isEqualTo(403);
                c.configurarAcoes(perfil, List.of());
                assertThat(acoesEfetivas(c, token)).isEmpty();
                negar(c.schema, ator, codigo, unidade, 403);
                assertThat(c.enviar("GET", "/api/v1/auth/me", token, null).getStatus()).isEqualTo(200);
            }
        }
    }

    private Set<String> acoesEfetivas(CatalogoCenario c, String token) throws Exception {
        var resposta = c.enviar("GET", "/api/v1/acessos/efetivos", token, null);
        assertThat(resposta.getStatus()).isEqualTo(200);
        var acoes = new HashSet<String>();
        c.json(resposta).get("acoes").forEach(a -> acoes.add(a.asText()));
        return acoes;
    }

    private void autorizar(String schema, IdentidadeAtual ator, String codigo, UUID unidade) {
        try (var scope = TenantScope.open(schema)) {
            new TransactionTemplate(transactions).executeWithoutResult(s -> acessos.autorizar(ator, Acao.obter(codigo), unidade));
        }
    }

    private void negar(String schema, IdentidadeAtual ator, String codigo, UUID unidade, int status) {
        assertThatThrownBy(() -> autorizar(schema, ator, codigo, unidade))
                .isInstanceOfSatisfying(AuthFailure.class, erro -> assertThat(erro.status()).isEqualTo(status));
    }
}
