package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.restaurantmanager.tenancy.TenantScope;
import br.com.restaurantmanager.unidades.UnidadeService;
import java.sql.DriverManager;
import java.util.UUID;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class FundacaoTest {
    @Autowired MockMvc mvc;
    @Autowired DataSource dataSource;
    @Autowired UnidadeService unidades;
    static final String A = "t_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    static final String B = "t_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

    @BeforeAll
    static void protegerAlvo() throws Exception {
        TestDatabase.prepare();
    }

    @Test void saudeMinimaSemDiagnostico() throws Exception {
        mvc.perform(get("/actuator/health")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
    }

    @Test void dominioDesconhecidoFalhaFechado() throws Exception {
        mvc.perform(get("/api/v1/unidades").header("Host", "invasor.localhost"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.codigo").value("EMPRESA_INDISPONIVEL"))
                .andExpect(jsonPath("$.stackTrace").doesNotExist());
    }

    @Test void dominioRegistradoNaoAceitaHeaderArbitrario() throws Exception {
        mvc.perform(get("/api/v1/unidades").header("Host", "a.localhost").header("X-Tenant", B))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].nome").value("A1"))
                .andExpect(jsonPath("$.length()").value(2));
        mvc.perform(get("/api/v1/unidades").header("Host", "b.localhost").header("Forwarded", "host=a.localhost"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].nome").value("B1"))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test void semTenantNaoConsultaNemUsaPublicComoFallback() {
        assertThatThrownBy(() -> unidades.listar()).isInstanceOf(RuntimeException.class);
        assertThat(TenantScope.current()).isEqualTo("__none__");
    }

    @Test void limpaThreadEConexaoAposErro() throws Exception {
        assertThatThrownBy(() -> {
            try (var ignored = TenantScope.open(A)) {
                unidades.listar();
                throw new IllegalStateException("falha controlada");
            }
        }).isInstanceOf(IllegalStateException.class);
        try (var ignored = TenantScope.open(B)) {
            assertThat(unidades.listar()).extracting(u -> u.nome()).containsExactly("B1");
        }
        assertThat(TenantScope.current()).isEqualTo("__none__");
        try (var c = dataSource.getConnection(); var s = c.createStatement(); var r = s.executeQuery("show search_path")) {
            r.next(); assertThat(r.getString(1)).isEqualTo("pg_catalog");
        }
    }

    @Test void runtimeNaoPodeCriarTabelaOuAcessarOutroBanco() throws Exception {
        try (var c = dataSource.getConnection(); var s = c.createStatement()) {
            assertThatThrownBy(() -> s.execute("create table public.invasao(id int)"))
                    .isInstanceOf(java.sql.SQLException.class);
        }
        assertThatThrownBy(() -> DriverManager.getConnection(
                System.getenv("RM_DB_URL").replace("/rm_test", "/rm_hml"),
                System.getenv("RM_DB_USER"), System.getenv("RM_DB_PASSWORD")))
                .isInstanceOf(java.sql.SQLException.class);
    }

    @Test void errosERotasPrivadasNegadosSemVazarDetalhes() throws Exception {
        mvc.perform(get("/api/v1/equipe")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/env")).andExpect(status().isUnauthorized());
    }
}
