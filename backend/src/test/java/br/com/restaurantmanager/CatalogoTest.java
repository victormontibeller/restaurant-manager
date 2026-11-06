package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static br.com.restaurantmanager.CatalogoCenario.OUTRA_UNIDADE;
import static br.com.restaurantmanager.CatalogoCenario.UNIDADE;

import br.com.restaurantmanager.catalogo.ContratoCatalogo.Adicional;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Categoria;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Grupo;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Opcao;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Produto;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.TipoProduto;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class CatalogoTest {
    private static final String CATEGORIAS = "/api/v1/gestao/catalogo/categorias";
    private static final String PRODUTOS = "/api/v1/gestao/catalogo/produtos";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private CatalogoCenario c;

    @BeforeAll
    static void preparar() throws Exception {
        TestDatabase.prepare();
    }

    @BeforeEach
    void massaPropria() throws Exception {
        c = new CatalogoCenario(mvc, mapper);
    }

    @AfterEach
    void limparMassaPropria() throws Exception {
        c.close();
    }

    @Test
    void criacaoIdempotenteVersaoENoOpPreservamAuditoriaEIdentidadeDoAtor() throws Exception {
        var categoria = c.categoria("Lanches");
        var produto = c.produto(categoria, "Hambúrguer", List.of(), List.of());
        assertThat(c.enviar("POST", CATEGORIAS, c.token, categoria).getStatus()).isEqualTo(200);
        assertThat(c.enviar("POST", PRODUTOS, c.token, produto).getStatus()).isEqualTo(200);
        assertThat(c.enviar("PUT", PRODUTOS + "/" + produto.id(), c.token, produto).getStatus()).isEqualTo(200);
        assertThat(c.contar("auditoria_catalogo")).isEqualTo(2);

        var alterado = alterar(produto, 0, "Novo nome", true, produto.adicionais(), produto.grupos());
        assertThat(c.enviar("PUT", PRODUTOS + "/" + produto.id(), c.token, alterado).getStatus()).isEqualTo(200);
        var replay = c.json(c.enviar("POST", PRODUTOS, c.token, produto));
        assertThat(replay.get("nome").asText()).isEqualTo("Novo nome");
        assertThat(replay.get("versao").asLong()).isEqualTo(1);
        assertThat(c.enviar("PUT", PRODUTOS + "/" + produto.id(), c.token, alterado).getStatus()).isEqualTo(409);
        assertThat(c.enviar("POST", PRODUTOS, c.token, alterado).getStatus()).isEqualTo(409);
        String gerente = c.login(c.usuario("GERENTE"));
        assertThat(c.enviar("POST", PRODUTOS, gerente, produto).getStatus()).isEqualTo(409);
        assertThat(c.contar("produto")).isEqualTo(1);
        assertThat(c.contar("auditoria_catalogo")).isEqualTo(3);
    }

    @Test
    void catalogoCompartilhadoEOfertaLocalRespeitamAcaoUnidadeETenant() throws Exception {
        var gerenteId = c.usuario("GERENTE");
        c.vincular(gerenteId, UNIDADE);
        String gerente = c.login(gerenteId);
        var categoria = c.categoria("Principal");
        var produto = c.produto(categoria, "Arroz", List.of(), List.of());
        assertThat(c.enviar("GET", PRODUTOS, gerente, null).getStatus()).isEqualTo(200);
        assertThat(c.enviar("GET", c.oferta(produto.id(), UNIDADE), gerente, null).getStatus()).isEqualTo(200);
        assertThat(c.enviar("GET", c.oferta(produto.id(), OUTRA_UNIDADE), gerente, null).getStatus()).isEqualTo(404);
        assertThat(c.enviar("PUT", c.oferta(produto.id(), OUTRA_UNIDADE), gerente, oferta(0, "9.00")).getStatus()).isEqualTo(404);

        assertThat(c.enviar("PUT", c.oferta(produto.id(), UNIDADE), gerente, oferta(0, "10.00")).getStatus()).isEqualTo(200);
        c.ofertar(produto.id(), OUTRA_UNIDADE, "20.00", true);
        assertThat(c.json(c.enviar("GET", c.oferta(produto.id(), UNIDADE), gerente, null)).get("preco").asText()).isEqualTo("10.00");
        assertThat(c.json(c.enviar("GET", c.oferta(produto.id(), OUTRA_UNIDADE), c.token, null)).get("preco").asText()).isEqualTo("20.00");
        c.executar("delete from " + c.schema + ".permissao_perfil where perfil='GERENTE' and acao='catalogo.editar'");
        assertThat(c.enviar("GET", PRODUTOS, gerente, null).getStatus()).isEqualTo(403);
        assertThat(c.enviar("PUT", c.oferta(produto.id(), UNIDADE), gerente, oferta(1, "11.00")).getStatus()).isEqualTo(200);

        for (String perfil : List.of("ATENDIMENTO", "CAIXA", "COZINHA", "EXPEDICAO")) {
            UUID usuario = c.usuario(perfil);
            c.vincular(usuario, UNIDADE);
            String access = c.login(usuario);
            assertThat(c.enviar("GET", "/api/v1/operacao/catalogo?unidadeId=" + UNIDADE, access, null).getStatus()).isEqualTo(200);
            assertThat(c.enviar("GET", PRODUTOS, access, null).getStatus()).isEqualTo(403);
            assertThat(c.enviar("PUT", c.oferta(produto.id(), UNIDADE), access, oferta(2, "1.00")).getStatus()).isEqualTo(403);
        }
        try (var outro = new CatalogoCenario(mvc, mapper)) {
            assertThat(outro.enviar("GET", PRODUTOS + "/" + produto.id(), outro.token, null).getStatus()).isEqualTo(404);
            assertThat(outro.enviar("GET", outro.publico(produto.id()), null, null).getStatus()).isEqualTo(404);
            assertThat(outro.enviar("GET", PRODUTOS, c.token, null).getStatus()).isEqualTo(401);
        }
    }

    @Test
    void produtoInativoECategoriaInativaSaoOcultadosSemExcluirConfiguracao() throws Exception {
        var categoria = c.categoria("Principal");
        var produto = c.produto(categoria, "Prato", List.of(), List.of());
        c.ofertar(produto.id(), UNIDADE, "12.50", true);
        c.abrir(UNIDADE);
        assertThat(c.enviar("GET", c.publico(produto.id()), null, null).getStatus()).isEqualTo(200);
        var inativa = new Categoria(categoria.id(), categoria.nome(), false, 0L);
        assertThat(c.enviar("PUT", CATEGORIAS + "/" + categoria.id(), c.token, inativa).getStatus()).isEqualTo(200);
        assertThat(c.enviar("GET", c.publico(produto.id()), null, null).getStatus()).isEqualTo(404);
        assertThat(c.enviar("GET", PRODUTOS + "/" + produto.id(), c.token, null).getStatus()).isEqualTo(200);
        var novo = new Produto(UUID.randomUUID(), 0L, "Inválido", "", categoria.id(), TipoProduto.SIMPLES, true, false, null, List.of(), List.of());
        assertThat(c.enviar("POST", PRODUTOS, c.token, novo).getStatus()).isEqualTo(422);
        assertThat(c.enviar("PUT", PRODUTOS + "/" + produto.id(), c.token,
                alterar(produto, 0, produto.nome(), false, List.of(), List.of())).getStatus()).isEqualTo(200);
        assertThat(c.contar("produto")).isEqualTo(1);
        assertThat(c.contar("produto_unidade")).isEqualTo(1);
    }

    @Test
    void configuracaoValidaLimitesReferenciasValoresEImpedeComboAninhado() throws Exception {
        var categoria = c.categoria("Principal");
        var adicional = new Adicional(UUID.randomUUID(), "Queijo", "3.00", 2, true);
        var componente = c.produto(categoria, "Componente", List.of(adicional), List.of());
        var grupo = new Grupo(UUID.randomUUID(), "Escolhas", 1, 2,
                List.of(new Opcao(UUID.randomUUID(), componente.id(), "5.00", 2, List.of(adicional.id()))));
        var combo = c.produto(categoria, "Combo", List.of(), List.of(grupo));
        var aninhado = new Grupo(UUID.randomUUID(), "Aninhado", 1, 1,
                List.of(new Opcao(UUID.randomUUID(), combo.id(), "1.00", 1, List.of())));
        var tentativa = alterar(componente, 0, "Não pode virar combo", true, List.of(), List.of(aninhado));
        assertThat(c.enviar("PUT", PRODUTOS + "/" + componente.id(), c.token, tentativa).getStatus()).isEqualTo(422);
        var invalidos = List.of(
                new Grupo(UUID.randomUUID(), "Mínimo", 3, 2, grupo.opcoes()),
                new Grupo(UUID.randomUUID(), "Capacidade", 3, 3, grupo.opcoes()),
                new Grupo(UUID.randomUUID(), "Adicional alheio", 1, 1,
                        List.of(new Opcao(UUID.randomUUID(), componente.id(), "0.00", 1, List.of(UUID.randomUUID())))));
        for (var invalido : invalidos) {
            assertThat(c.enviar("PUT", PRODUTOS + "/" + combo.id(), c.token,
                    alterar(combo, 0, "Inválido", true, List.of(), List.of(invalido))).getStatus()).isEqualTo(422);
        }
        String json = mapper.writeValueAsString(componente);
        for (String preco : List.of("\"1.001\"", "\"-1\"", "3.00", "null")) {
            assertThat(c.enviarJson("PUT", PRODUTOS + "/" + componente.id(), c.token,
                    json.replace("\"preco\":\"3.00\"", "\"preco\":" + preco)).getStatus()).isEqualTo(400);
        }
        assertThat(c.enviarJson("PUT", PRODUTOS + "/" + componente.id(), c.token,
                json.replace("\"maximo\":2", "\"maximo\":1.5")).getStatus()).isEqualTo(400);

        assertThat(c.enviar("PUT", PRODUTOS + "/" + componente.id(), c.token,
                alterar(componente, 0, componente.nome(), false, componente.adicionais(), List.of())).getStatus()).isEqualTo(200);
        assertThat(c.enviar("PUT", PRODUTOS + "/" + combo.id(), c.token,
                alterar(combo, 0, "Combo em revisão", true, List.of(), combo.grupos())).getStatus()).isEqualTo(200);
        assertThat(c.enviar("PUT", PRODUTOS + "/" + combo.id(), c.token,
                alterar(combo, 1, "Combo em revisão", false, List.of(), combo.grupos())).getStatus()).isEqualTo(200);
        assertThat(c.enviar("PUT", PRODUTOS + "/" + combo.id(), c.token,
                alterar(combo, 2, "Não reativar", true, List.of(), combo.grupos())).getStatus()).isEqualTo(422);
    }

    @Test
    void buscaPaginacaoESugestoesNaoTruncamNemExibemDadosPrivados() throws Exception {
        var categoria = c.categoria("Principal");
        for (int i = 0; i < 52; i++) c.produto(categoria, "Item " + String.format("%02d", i), List.of(), List.of());
        var admin = c.json(c.enviar("GET", PRODUTOS, c.token, null));
        assertThat(admin.get("itens").size()).isEqualTo(50);
        assertThat(admin.get("temMais").asBoolean()).isTrue();
        var segunda = c.json(c.enviar("GET", PRODUTOS + "?pagina=1", c.token, null));
        assertThat(segunda.get("itens").size()).isEqualTo(2);
        assertThat(segunda.get("temMais").asBoolean()).isFalse();
        assertThat(c.enviar("GET", PRODUTOS + "?pagina=-1", c.token, null).getStatus()).isEqualTo(400);
        assertThat(c.enviar("GET", PRODUTOS + "?pagina=10001", c.token, null).getStatus()).isEqualTo(400);

        UUID id = UUID.fromString(segunda.get("itens").get(0).get("id").asText());
        var sugerido = mapper.treeToValue(segunda.get("itens").get(0), Produto.class);
        var curado = new Produto(sugerido.id(), sugerido.versao(), sugerido.nome(), sugerido.descricao(),
                sugerido.categoriaId(), sugerido.tipo(), sugerido.ativo(), true, null, List.of(), List.of());
        assertThat(c.enviar("PUT", PRODUTOS + "/" + id, c.token, curado).getStatus()).isEqualTo(200);
        c.ofertar(id, UNIDADE, "7.00", true);
        UUID primeiro = UUID.fromString(admin.get("itens").get(0).get("id").asText());
        c.ofertar(primeiro, UNIDADE, "9.00", true);
        c.abrir(UNIDADE);
        String caminho = "/api/v1/catalogo?unidadeId=" + UNIDADE + "&canal=DELIVERY";
        var publico = c.enviar("GET", caminho + "&busca=ITEM", null, null);
        assertThat(c.json(publico).get("itens").size()).isEqualTo(2);
        assertThat(c.json(publico).get("itens").get(0).get("id").asText()).isEqualTo(id.toString());
        assertThat(c.json(publico).get("itens").get(0).get("sugerido").asBoolean()).isTrue();
        assertThat(publico.getContentAsString()).doesNotContain("criacao", "email", "senha", "schema", "ator");
        assertThat(c.json(c.enviar("GET", caminho + "&busca=%25", null, null)).get("itens").size()).isZero();
        var operacional = c.json(c.enviar("GET", "/api/v1/operacao/catalogo?unidadeId=" + UNIDADE, c.token, null));
        assertThat(operacional.get("itens").size()).isEqualTo(50);
        assertThat(operacional.get("temMais").asBoolean()).isTrue();
    }

    @Test
    void favoritosSaoPessoaisIdempotentesEApenasClientesAtivosPodemAlterar() throws Exception {
        var categoria = c.categoria("Principal");
        var produto = c.produto(categoria, "Preferido", List.of(), List.of());
        String cliente = c.login(c.usuario("CLIENTE"));
        String outro = c.login(c.usuario("CLIENTE"));
        String rota = "/api/v1/clientes/me/favoritos";
        assertThat(c.enviar("PUT", rota + "/" + produto.id(), cliente, null).getStatus()).isEqualTo(204);
        assertThat(c.enviar("PUT", rota + "/" + produto.id(), cliente, null).getStatus()).isEqualTo(204);
        assertThat(c.contar("favorito")).isEqualTo(1);
        assertThat(c.json(c.enviar("GET", rota, cliente, null)).get("produtoIds").size()).isEqualTo(1);
        assertThat(c.json(c.enviar("GET", rota, outro, null)).get("produtoIds").size()).isZero();
        assertThat(c.enviar("DELETE", rota + "/" + produto.id(), outro, null).getStatus()).isEqualTo(204);
        assertThat(c.contar("favorito")).isEqualTo(1);
        assertThat(c.enviar("PUT", rota + "/" + produto.id(), c.token, null).getStatus()).isEqualTo(403);
        assertThat(c.enviar("PUT", rota + "/" + produto.id(), cliente, Map.of("usuarioId", UUID.randomUUID())).getStatus()).isEqualTo(400);
        assertThat(c.enviar("PUT", rota + "/" + UUID.randomUUID(), cliente, null).getStatus()).isEqualTo(404);

        assertThat(c.enviar("PUT", PRODUTOS + "/" + produto.id(), c.token,
                alterar(produto, 0, produto.nome(), false, List.of(), List.of())).getStatus()).isEqualTo(200);
        assertThat(c.json(c.enviar("GET", rota, cliente, null)).get("produtoIds").size()).isZero();
        assertThat(c.enviar("PUT", rota + "/" + produto.id(), cliente, null).getStatus()).isEqualTo(404);
        assertThat(c.enviar("DELETE", rota + "/" + produto.id(), cliente, null).getStatus()).isEqualTo(204);
        assertThat(c.contar("favorito")).isZero();
    }

    @Test
    void escritaConcorrenteDaOfertaTemUmVencedorESemPerderAuditoria() throws Exception {
        var produto = c.produto(c.categoria("Principal"), "Prato", List.of(), List.of());
        var barreira = new CyclicBarrier(2);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var primeira = pool.submit(() -> {
                barreira.await(5, TimeUnit.SECONDS);
                return c.enviar("PUT", c.oferta(produto.id(), UNIDADE), c.token, oferta(0, "10.00")).getStatus();
            });
            var segunda = pool.submit(() -> {
                barreira.await(5, TimeUnit.SECONDS);
                return c.enviar("PUT", c.oferta(produto.id(), UNIDADE), c.token, oferta(0, "20.00")).getStatus();
            });
            assertThat(List.of(primeira.get(20, TimeUnit.SECONDS), segunda.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(200, 409);
        }
        assertThat(c.contar("produto_unidade")).isEqualTo(1);
        assertThat(c.contar("auditoria_catalogo")).isEqualTo(3);
    }

    @Test
    void revogacaoDuranteEsperaRevalidaSessaoAntesDeEscreverCatalogo() throws Exception {
        var produto = c.produto(c.categoria("Principal"), "Prato", List.of(), List.of());
        try (var conexao = c.banco(); var pool = Executors.newSingleThreadExecutor()) {
            conexao.setAutoCommit(false);
            try (var sql = conexao.createStatement()) {
                sql.execute("select versao from " + c.schema + ".politica_acesso where id=1 for update");
            }
            var iniciou = new CountDownLatch(1);
            var escrita = pool.submit(() -> {
                iniciou.countDown();
                return c.enviar("PUT", c.oferta(produto.id(), UNIDADE), c.token, oferta(0, "10.00")).getStatus();
            });
            try {
                assertThat(iniciou.await(5, TimeUnit.SECONDS)).isTrue();
                assertThatThrownBy(() -> escrita.get(1, TimeUnit.SECONDS)).isInstanceOf(TimeoutException.class);
                try (var sql = conexao.createStatement()) {
                    sql.execute("update " + c.schema + ".sessao set revogada_em=now()");
                }
            } finally {
                conexao.commit();
            }
            assertThat(escrita.get(20, TimeUnit.SECONDS)).isEqualTo(401);
        }
        assertThat(c.contar("produto_unidade")).isZero();
        assertThat(c.contar("auditoria_catalogo")).isEqualTo(2);
    }

    @Test
    void logoutDuranteEsperaDoCatalogoImpedeEscritaMesmoAposPrimeiraAutorizacao() throws Exception {
        var produto = c.produto(c.categoria("Principal"), "Prato", List.of(), List.of());
        try (var conexao = c.banco(); var pool = Executors.newSingleThreadExecutor()) {
            conexao.setAutoCommit(false);
            try (var sql = conexao.createStatement()) {
                sql.execute("select versao from " + c.schema + ".catalogo_revisao where id=1 for update");
            }
            var escrita = pool.submit(() -> c.enviar("PUT", c.oferta(produto.id(), UNIDADE), c.token, oferta(0, "10.00")).getStatus());
            try {
                assertThatThrownBy(() -> escrita.get(1, TimeUnit.SECONDS)).isInstanceOf(TimeoutException.class);
                try (var sql = conexao.createStatement()) {
                    sql.execute("update " + c.schema + ".sessao set revogada_em=now()");
                }
            } finally {
                conexao.commit();
            }
            assertThat(escrita.get(20, TimeUnit.SECONDS)).isEqualTo(401);
        }
        assertThat(c.contar("produto_unidade")).isZero();
        assertThat(c.contar("auditoria_catalogo")).isEqualTo(2);
    }

    @Test
    void favoritosRevalidamSessaoAposEsperaDoLockDoTitular() throws Exception {
        var produto = c.produto(c.categoria("Principal"), "Prato", List.of(), List.of());
        UUID usuario = c.usuario("CLIENTE");
        String access = c.login(usuario);
        try (var conexao = c.banco(); var pool = Executors.newSingleThreadExecutor()) {
            conexao.setAutoCommit(false);
            try (var sql = conexao.createStatement()) {
                sql.execute("select pg_advisory_xact_lock(hashtextextended('favoritos:" + usuario + "',0))");
            }
            var escrita = pool.submit(() -> c.enviar("PUT", "/api/v1/clientes/me/favoritos/" + produto.id(), access, null).getStatus());
            try {
                assertThatThrownBy(() -> escrita.get(1, TimeUnit.SECONDS)).isInstanceOf(TimeoutException.class);
                try (var sql = conexao.createStatement()) {
                    sql.execute("update " + c.schema + ".sessao set revogada_em=now() where usuario_id='" + usuario + "'");
                }
            } finally {
                conexao.commit();
            }
            assertThat(escrita.get(20, TimeUnit.SECONDS)).isEqualTo(401);
        }
        assertThat(c.contar("favorito")).isZero();
    }

    @Test
    void limiteDeFavoritosPermaneceDuzentosSobConcorrencia() throws Exception {
        var categoria = c.categoria("Principal");
        UUID usuario = c.usuario("CLIENTE");
        String access = c.login(usuario);
        c.executar("insert into " + c.schema + ".produto(id,nome,descricao,categoria_id,tipo,ativo,sugerido,versao,adicionais,grupos,criacao_ator,criacao_payload) "
                + "select gen_random_uuid(),'Fictício '||numero,'','" + categoria.id() + "','SIMPLES',true,false,0,'[]','[]','"
                + c.administrador + "','{}' from generate_series(1,201) numero");
        c.executar("insert into " + c.schema + ".favorito(usuario_id,produto_id) select '" + usuario
                + "',id from " + c.schema + ".produto order by id limit 199");
        var restantes = new ArrayList<UUID>();
        try (var conexao = c.banco(); var sql = conexao.createStatement();
                var resultado = sql.executeQuery("select id from " + c.schema + ".produto order by id offset 199")) {
            while (resultado.next()) restantes.add(resultado.getObject(1, UUID.class));
        }
        var barreira = new CyclicBarrier(2);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var primeira = pool.submit(() -> {
                barreira.await(5, TimeUnit.SECONDS);
                return c.enviar("PUT", "/api/v1/clientes/me/favoritos/" + restantes.get(0), access, null).getStatus();
            });
            var segunda = pool.submit(() -> {
                barreira.await(5, TimeUnit.SECONDS);
                return c.enviar("PUT", "/api/v1/clientes/me/favoritos/" + restantes.get(1), access, null).getStatus();
            });
            assertThat(List.of(primeira.get(20, TimeUnit.SECONDS), segunda.get(20, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(204, 422);
        }
        assertThat(c.contar("favorito")).isEqualTo(200);
        assertThat(c.json(c.enviar("GET", "/api/v1/clientes/me/favoritos", access, null)).get("produtoIds").size()).isEqualTo(200);
    }

    @Test
    void novaInclusaoRecuperaCotaDeFavoritosOcultosSemAlterarGetOuOutroCliente() throws Exception {
        var principal = c.categoria("Principal");
        var sazonal = c.categoria("Sazonal");
        UUID usuario = c.usuario("CLIENTE");
        UUID outroUsuario = c.usuario("CLIENTE");
        String access = c.login(usuario);
        String outroAccess = c.login(outroUsuario);
        c.executar("insert into " + c.schema + ".produto(id,nome,descricao,categoria_id,tipo,ativo,sugerido,versao,adicionais,grupos,criacao_ator,criacao_payload) "
                + "select gen_random_uuid(),'Fictício '||numero,'',case when numero<=100 then '" + principal.id()
                + "'::uuid else '" + sazonal.id() + "'::uuid end,'SIMPLES',numero>100,false,0,'[]','[]','"
                + c.administrador + "','{}' from generate_series(1,200) numero");
        for (UUID titular : List.of(usuario, outroUsuario)) {
            c.executar("insert into " + c.schema + ".favorito(usuario_id,produto_id) select '" + titular
                    + "',id from " + c.schema + ".produto");
        }
        assertThat(c.enviar("PUT", CATEGORIAS + "/" + sazonal.id(), c.token,
                new Categoria(sazonal.id(), sazonal.nome(), false, 0L)).getStatus()).isEqualTo(200);
        var novo = c.produto(principal, "Nova opção", List.of(), List.of());
        String rota = "/api/v1/clientes/me/favoritos";

        assertThat(c.json(c.enviar("GET", rota, access, null)).get("produtoIds").size()).isZero();
        assertThat(c.json(c.enviar("GET", rota, outroAccess, null)).get("produtoIds").size()).isZero();
        assertThat(c.contar("favorito")).isEqualTo(400);
        assertThat(c.enviar("PUT", rota + "/" + UUID.randomUUID(), access, null).getStatus()).isEqualTo(404);
        assertThat(c.contar("favorito")).isEqualTo(400);

        assertThat(c.enviar("PUT", rota + "/" + novo.id(), access, null).getStatus()).isEqualTo(204);
        assertThat(c.enviar("PUT", rota + "/" + novo.id(), access, null).getStatus()).isEqualTo(204);
        assertThat(c.contar("favorito")).isEqualTo(201);
        var favoritos = c.json(c.enviar("GET", rota, access, null)).get("produtoIds");
        assertThat(favoritos.size()).isEqualTo(1);
        assertThat(favoritos.get(0).asText()).isEqualTo(novo.id().toString());

        c.executar("update " + c.schema + ".produto set ativo=true where categoria_id='" + principal.id() + "'");
        assertThat(c.enviar("PUT", CATEGORIAS + "/" + sazonal.id(), c.token,
                new Categoria(sazonal.id(), sazonal.nome(), true, 1L)).getStatus()).isEqualTo(200);
        assertThat(c.json(c.enviar("GET", rota, outroAccess, null)).get("produtoIds").size()).isEqualTo(200);
        assertThat(c.json(c.enviar("GET", rota, access, null)).get("produtoIds").size()).isEqualTo(1);
        assertThat(c.contar("favorito")).isEqualTo(201);
    }

    @Test
    void falhaDeAuditoriaReverteEscritaEConstraintsImpedemDadosOrfaosOuNegativos() throws Exception {
        var produto = c.produto(c.categoria("Principal"), "Prato", List.of(), List.of());
        c.executar("alter table " + c.schema + ".auditoria_catalogo add constraint teste_falha check(evento <> 'OFERTA_ALTERADA')");
        assertThat(c.enviar("PUT", c.oferta(produto.id(), UNIDADE), c.token, oferta(0, "10.00")).getStatus()).isEqualTo(500);
        assertThat(c.contar("produto_unidade")).isZero();
        assertThat(c.contar("auditoria_catalogo")).isEqualTo(2);
        for (String valores : List.of("'" + produto.id() + "','" + UNIDADE + "',1,-1,true,true,false,false",
                "'" + UUID.randomUUID() + "','" + UNIDADE + "',1,1,true,true,false,false",
                "'" + produto.id() + "','" + UNIDADE + "',0,1,true,true,false,false")) {
            assertThatThrownBy(() -> c.executar("insert into " + c.schema + ".produto_unidade values (" + valores + ")"))
                    .isInstanceOf(SQLException.class);
        }
    }

    private Map<String, Object> oferta(long versao, String preco) {
        return Map.of("versao", versao, "preco", preco, "disponivel", true, "canais", List.of("DELIVERY"));
    }

    private Produto alterar(Produto atual, long versao, String nome, boolean ativo, List<Adicional> adicionais, List<Grupo> grupos) {
        return new Produto(atual.id(), versao, nome, atual.descricao(), atual.categoriaId(),
                grupos.isEmpty() ? TipoProduto.SIMPLES : TipoProduto.COMBO, ativo, atual.sugerido(), atual.midiaId(), adicionais, grupos);
    }
}
