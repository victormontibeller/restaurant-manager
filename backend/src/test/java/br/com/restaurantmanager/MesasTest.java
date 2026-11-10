package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class MesasTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @Test
    void cadastroProtegidoVersionadoESemCodigoNaListagem() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            UUID id = UUID.randomUUID();
            var body = Map.of("id", id, "unidadeId", CatalogoCenario.UNIDADE, "nome", "Mesa 02");
            assertThat(c.base.enviar("POST", "/api/v1/operacao/mesas", c.base.token, body).getStatus()).isEqualTo(403);
            c.base.executar("update " + c.base.schema + ".sessao set reautenticada_em=current_timestamp where usuario_id='" + c.base.administrador + "'");
            assertThat(c.base.enviar("POST", "/api/v1/operacao/mesas", c.base.token, body).getStatus()).isEqualTo(200);
            assertThat(c.base.enviar("POST", "/api/v1/operacao/mesas", c.base.token, body).getStatus()).isEqualTo(200);
            assertThat(c.base.contar("mesa")).isEqualTo(2);
            var editada = c.base.enviar("PUT", "/api/v1/operacao/mesas/" + id, c.base.token,
                    Map.of("versao", 0, "nome", "Mesa 03", "ativa", true));
            assertThat(editada.getStatus()).isEqualTo(200);
            assertThat(c.base.json(editada).get("versao").asLong()).isEqualTo(1);
            var repetidaAposEdicao = c.base.enviar("POST", "/api/v1/operacao/mesas", c.base.token, body);
            assertThat(repetidaAposEdicao.getStatus()).isEqualTo(200);
            assertThat(c.base.json(repetidaAposEdicao).get("nome").asText()).isEqualTo("Mesa 03");
            assertThat(c.base.enviar("PUT", "/api/v1/operacao/mesas/" + id, c.base.token,
                    Map.of("versao", 0, "nome", "Mesa 04", "ativa", true)).getStatus()).isEqualTo(409);
            c.abrir();
            var lista = c.base.enviar("GET", "/api/v1/operacao/mesas?unidadeId=" + CatalogoCenario.UNIDADE, c.base.token, null);
            assertThat(lista.getStatus()).isEqualTo(200);
            assertThat(lista.getContentAsString()).doesNotContain("codigo", "hash", "participante", "email");
            assertThat(lista.getContentAsString()).contains("atendimentoVersao");
        }
    }

    @Test
    void aberturaIdempotentePreservaAutoriaENaoDevolveCodigoNovamente() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            UUID intencao = UUID.randomUUID();
            var primeira = c.abrir(intencao, c.base.token);
            var repetida = c.abrir(intencao, c.base.token);
            assertThat(primeira.getStatus()).isEqualTo(200);
            assertThat(repetida.getStatus()).isEqualTo(200);
            assertThat(c.base.json(repetida).get("atendimentoId")).isEqualTo(c.base.json(primeira).get("atendimentoId"));
            assertThat(c.base.json(repetida).get("codigoTemporario").isNull()).isTrue();
            assertThat(c.base.contar("atendimento")).isEqualTo(1);
            assertThat(c.base.contar("comanda")).isEqualTo(1);
            var equipe = c.funcionario("ATENDIMENTO", CatalogoCenario.UNIDADE);
            assertThat(c.abrir(intencao, equipe).getStatus()).isEqualTo(409);
            assertThat(c.abrir(UUID.randomUUID(), c.base.token).getStatus()).isEqualTo(409);
        }
    }

    @Test
    void duasAberturasConcorrentesTemUmUnicoAtendimento() throws Exception {
        try (var c = new MesasCenario(mvc, mapper); var executor = Executors.newFixedThreadPool(2)) {
            var barreira = new CyclicBarrier(2);
            var tarefas = List.of(UUID.randomUUID(), UUID.randomUUID()).stream().map(id -> executor.submit(() -> {
                barreira.await(10, TimeUnit.SECONDS);
                return c.abrir(id, c.base.token).getStatus();
            })).toList();
            assertThat(List.of(tarefas.get(0).get(20, TimeUnit.SECONDS), tarefas.get(1).get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
            assertThat(c.base.contar("atendimento")).isEqualTo(1);
        }
    }

    @Test
    void mesaInativaCanalFechadoUnidadeAlheiaENovoAtendimentoSuspensoSaoNegados() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            String restrito = c.funcionario("ATENDIMENTO", CatalogoCenario.OUTRA_UNIDADE);
            assertThat(c.abrir(UUID.randomUUID(), restrito).getStatus()).isEqualTo(404);
            String cozinha = c.funcionario("COZINHA", CatalogoCenario.UNIDADE);
            assertThat(c.abrir(UUID.randomUUID(), cozinha).getStatus()).isEqualTo(403);
            c.base.executar("update " + c.base.schema + ".mesa set ativa=false");
            assertThat(c.abrir(UUID.randomUUID(), c.base.token).getStatus()).isEqualTo(409);
            c.base.executar("update " + c.base.schema + ".mesa set ativa=true");
            c.base.executar("update " + c.base.schema + ".funcionamento_unidade set mesa=false");
            assertThat(c.abrir(UUID.randomUUID(), c.base.token).getStatus()).isEqualTo(422);
            c.base.executar("update " + c.base.schema + ".funcionamento_unidade set mesa=true");
            c.base.executar("update public.empresa set estado='SUSPENSO' where id='" + c.base.empresa + "'");
            assertThat(c.abrir(UUID.randomUUID(), c.base.token).getStatus()).isEqualTo(409);
        }
    }

    @Test
    void pedirContaNaoFechaEDuplicacaoNaoCriaNovaSolicitacao() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            var atendimento = c.abrir();
            String participante = c.token(c.autorizar(atendimento));
            UUID intencao = UUID.randomUUID();
            var body = Map.of("intencaoId", intencao, "tipo", "CONTA");
            var primeira = c.base.enviar("POST", "/api/v1/mesa/solicitacoes", participante, body);
            var repetida = c.base.enviar("POST", "/api/v1/mesa/solicitacoes", participante, body);
            assertThat(primeira.getStatus()).isEqualTo(200);
            assertThat(c.base.json(repetida).get("id")).isEqualTo(c.base.json(primeira).get("id"));
            assertThat(c.base.contar("solicitacao_mesa")).isEqualTo(1);
            assertThat(c.base.enviar("POST", "/api/v1/mesa/solicitacoes", participante,
                    Map.of("intencaoId", intencao, "tipo", "AJUDA")).getStatus()).isEqualTo(409);
            String outro = c.token(c.autorizar(atendimento));
            assertThat(c.base.enviar("POST", "/api/v1/mesa/solicitacoes", outro, body).getStatus()).isEqualTo(409);
            var resumo = c.base.enviar("GET", "/api/v1/mesa/comanda", participante, null);
            assertThat(c.base.json(resumo).get("estado").asText()).isEqualTo("ABERTA");
            assertThat(resumo.getContentAsString()).doesNotContain("participante", "email", "usuario");
            String equipe = c.funcionario("ATENDIMENTO", CatalogoCenario.UNIDADE);
            String id = c.base.json(primeira).get("id").asText();
            var atendida = c.base.enviar("POST", "/api/v1/operacao/mesas/solicitacoes/" + id + "/atender", equipe, Map.of("versao", 0));
            assertThat(atendida.getStatus()).isEqualTo(200);
            assertThat(c.base.json(atendida).get("estado").asText()).isEqualTo("ATENDIDA");
        }
    }

    @Test
    void atenderSolicitacaoRevalidaAcaoFilialETenantSemAlterarPendenciaNegada() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            var aberto = c.abrir();
            String participante = c.token(c.autorizar(aberto));
            var criada = c.base.json(c.base.enviar("POST", "/api/v1/mesa/solicitacoes", participante,
                    Map.of("intencaoId", UUID.randomUUID(), "tipo", "AJUDA")));
            String rota = "/api/v1/operacao/mesas/solicitacoes/" + criada.get("id").asText() + "/atender";
            var comando = Map.of("versao", 0);
            String cozinha = c.funcionario("COZINHA", CatalogoCenario.UNIDADE);
            String equipe = c.funcionario("ATENDIMENTO", CatalogoCenario.UNIDADE);
            String outraUnidade = c.funcionario("ATENDIMENTO", CatalogoCenario.OUTRA_UNIDADE);
            assertThat(c.base.enviar("POST", rota, cozinha, comando).getStatus()).isEqualTo(403);
            assertThat(c.base.enviar("POST", rota, outraUnidade, comando).getStatus()).isEqualTo(404);
            try (var outro = new CatalogoCenario(mvc, mapper)) {
                assertThat(outro.enviar("POST", rota, outro.token, comando).getStatus()).isEqualTo(404);
            }
            c.base.reautenticar();
            c.base.configurarAcoes("ATENDIMENTO", List.of("pedido.consultar"));
            assertThat(c.base.enviar("POST", rota, equipe, comando).getStatus()).isEqualTo(403);
            assertThat(c.base.contar("solicitacao_mesa where estado='PENDENTE'")).isEqualTo(1);
            c.base.configurarAcoes("ATENDIMENTO", List.of("mesa.atender"));
            assertThat(c.base.enviar("POST", rota, equipe, comando).getStatus()).isEqualTo(200);
            assertThat(c.base.contar("solicitacao_mesa where estado='PENDENTE'")).isZero();
        }
    }

    @Test
    void fechamentoPreservaAcompanhamentoEEncerramentoRevogaGrupoAnterior() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            var atendimento = c.abrir();
            UUID comanda = c.comanda(atendimento);
            var autenticada = c.autorizar(atendimento);
            String participante = c.token(autenticada);
            assertThat(c.estado(comanda, "concluir", 0).getStatus()).isEqualTo(409);
            assertThat(c.estado(comanda, "iniciar-fechamento", 0).getStatus()).isEqualTo(200);
            assertThat(c.base.enviar("GET", "/api/v1/mesa/comanda", participante, null).getStatus()).isEqualTo(200);
            assertThat(c.estado(comanda, "reabrir", 1).getStatus()).isEqualTo(200);
            assertThat(c.estado(comanda, "iniciar-fechamento", 2).getStatus()).isEqualTo(200);
            assertThat(c.estado(comanda, "concluir", 3).getStatus()).isEqualTo(200);
            assertThat(c.base.enviar("GET", "/api/v1/mesa/sessao", participante, null).getStatus()).isEqualTo(401);
            assertThat(c.autenticar("refresh", null, autenticada.getCookie("RM_MESA_REFRESH")).getStatus()).isEqualTo(401);
            assertThat(c.estado(comanda, "reabrir", 4).getStatus()).isEqualTo(409);
            var novo = c.abrir();
            assertThat(novo.get("comandaId")).isNotEqualTo(atendimento.get("comandaId"));
            assertThat(c.autorizar(atendimento).getStatus()).isEqualTo(401);
            assertThat(c.autorizar(novo).getStatus()).isEqualTo(200);
        }
    }

    @Test
    void unidadeInativadaEEmpresaSuspensaPreservamResolucaoExistente() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            var atendimento = c.abrir();
            UUID comanda = c.comanda(atendimento);
            c.base.executar("update " + c.base.schema + ".unidade set ativa=false where id='" + CatalogoCenario.UNIDADE + "'");
            c.base.executar("update public.empresa set estado='SUSPENSO' where id='" + c.base.empresa + "'");
            assertThat(c.estado(comanda, "iniciar-fechamento", 0).getStatus()).isEqualTo(200);
            assertThat(c.estado(comanda, "concluir", 1).getStatus()).isEqualTo(200);
            assertThat(c.abrir(UUID.randomUUID(), c.base.token).getStatus()).isEqualTo(409);
        }
    }

    @Test
    void cozinhaNaoRecebeComandaFinanceiraNemOutraUnidade() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            UUID comanda = c.comanda(c.abrir());
            String cozinha = c.funcionario("COZINHA", CatalogoCenario.UNIDADE);
            var negada = c.base.enviar("GET", "/api/v1/comandas/" + comanda, cozinha, null);
            assertThat(negada.getStatus()).isEqualTo(403);
            assertThat(negada.getContentAsString()).doesNotContain("totalDevido", "saldoAReceber", "pagoConfirmado");
            String caixa = c.funcionario("CAIXA", CatalogoCenario.OUTRA_UNIDADE);
            assertThat(c.base.enviar("GET", "/api/v1/comandas/" + comanda, caixa, null).getStatus()).isEqualTo(404);
        }
    }
    @Test
    void eventosDeMesaRecuperamCursorSemRevelarIdentidadeDeOutroParticipante() throws Exception {
        try (var c = new MesasCenario(mvc, mapper)) {
            var atendimento = c.abrir();
            String primeiro = c.token(c.autorizar(atendimento));
            String segundo = c.token(c.autorizar(atendimento));
            var inicial = c.base.enviar("GET", "/api/v1/mesa/eventos?depois=-1", primeiro, null);
            assertThat(inicial.getStatus()).isEqualTo(200);
            String cursor = c.base.json(inicial).get("proximo").asText();
            assertThat(cursor).matches("[0-9]+\\.[0-9]+");
            var solicitacao = c.base.enviar("POST", "/api/v1/mesa/solicitacoes", segundo,
                    Map.of("intencaoId", UUID.randomUUID(), "tipo", "AJUDA"));
            assertThat(solicitacao.getStatus()).isEqualTo(200);
            var pagina = c.base.enviar("GET", "/api/v1/mesa/eventos?depois=" + cursor, primeiro, null);
            assertThat(pagina.getStatus()).isEqualTo(200);
            assertThat(pagina.getContentAsString()).contains("COMANDA_ATUALIZADA").doesNotContain("MESA_AJUDA", "participanteId", "email");
            String proximo = c.base.json(pagina).get("proximo").asText();
            var semNovidade = c.base.enviar("GET", "/api/v1/mesa/eventos?depois=" + proximo, primeiro, null);
            assertThat(c.base.json(semNovidade).get("eventos").size()).isZero();
            UUID comanda = c.comanda(atendimento);
            assertThat(c.estado(comanda, "iniciar-fechamento", 0).getStatus()).isEqualTo(200);
            assertThat(c.estado(comanda, "concluir", 1).getStatus()).isEqualTo(200);
            assertThat(c.base.enviar("GET", "/api/v1/mesa/eventos?depois=" + proximo, primeiro, null).getStatus()).isEqualTo(401);
        }
    }

}
