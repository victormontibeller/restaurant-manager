package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.restaurantmanager.tenancy.Migrations;
import br.com.restaurantmanager.plataforma.ProvisionamentoService;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class SolicitacaoProvisionamentoTest {
    private static final String HOST="plataforma.localhost";
    private static final String BASE="/api/v1/plataforma/provisionamentos";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private UUID operador;
    private String senha;
    private String token;
    @BeforeAll static void preparar() throws Exception { TestDatabase.prepare(); }
    @BeforeEach void autenticar() throws Exception {
        operador=UUID.randomUUID();senha=UUID.randomUUID().toString();String email=operador+"@example.invalid";
        try(var c=owner();var s=c.prepareStatement("insert into public.usuario_plataforma(id,email,senha_hash) values (?,?,?)")) {
            s.setObject(1,operador);s.setString(2,email);s.setString(3,new BCryptPasswordEncoder(12).encode(senha));s.executeUpdate();
        }
        novaSessao();
    }
    private void novaSessao() throws Exception {
        String email=operador+"@example.invalid";
        var csrf=mvc.perform(get("/api/v1/plataforma/auth/csrf").header("Host",HOST)).andReturn().getResponse();
        var body=mapper.readTree(csrf.getContentAsString());
        var login=mvc.perform(post("/api/v1/plataforma/auth/login").header("Host",HOST).cookie(csrf.getCookie("__Host-RM_PLATFORM_CSRF"))
                .header(body.get("headerName").asText(),body.get("token").asText())
                .with(r->{r.setRemoteAddr("2001:db8::"+operador.toString().substring(0,4));return r;})
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("email",email,"senha",senha))))
                .andExpect(status().isOk()).andReturn();
        token=mapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
        mvc.perform(post("/api/v1/plataforma/auth/reautenticar").header("Host",HOST).header("Authorization","Bearer "+token)
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("senha",senha)))).andExpect(status().isNoContent());
    }
    private Connection owner() throws Exception {
        var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"));
        Migrations.verifyIdentity(c,"rm_test","rm_test_owner");return c;
    }
    private Map<String,Object> pedido(UUID id) {
        return Map.of("id",id,"nome","Restaurante fictício","host","novo-"+id+".localhost","unidade","Unidade inicial","email","admin@example.invalid","senha",UUID.randomUUID().toString());
    }
    private MvcResult criar(Map<String,Object> pedido) throws Exception {
        return criar(pedido,token);
    }
    private MvcResult criar(Map<String,Object> pedido,String access) throws Exception {
        return mvc.perform(post(BASE).header("Host",HOST).header("Authorization","Bearer "+access).contentType("application/json").content(mapper.writeValueAsString(pedido))).andReturn();
    }
    @Test void solicitaSemCriarSchemaNemExporCredenciais() throws Exception {
        var id=UUID.randomUUID();var pedido=pedido(id);var r=criar(pedido);
        assertThat(r.getResponse().getStatus()).isEqualTo(202);
        var json=mapper.readTree(r.getResponse().getContentAsString());assertThat(json.get("estado").asText()).isEqualTo("SOLICITADO");
        assertThat(r.getResponse().getContentAsString()).doesNotContain("senha","hash","schema","admin@example.invalid");
        try(var c=owner();var s=c.prepareStatement("select count(*) from pg_namespace where nspname=?")) {
            s.setString(1,"t_"+id.toString().replace("-",""));try(var rows=s.executeQuery()){rows.next();assertThat(rows.getInt(1)).isZero();}
        }
        assertThat(criar(pedido).getResponse().getStatus()).isEqualTo(202);
    }
    private MvcResult consultar(UUID id) throws Exception {
        return mvc.perform(get(BASE+"/"+id).header("Host",HOST).header("Authorization","Bearer "+token)).andReturn();
    }
    private MvcResult retomar(UUID id,long versao) throws Exception {
        return mvc.perform(post(BASE+"/"+id+"/retomar").header("Host",HOST).header("Authorization","Bearer "+token)
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("versao",versao)))).andReturn();
    }
    private long contar(String sql,UUID id) throws Exception {
        try(var c=owner();var s=c.prepareStatement(sql)){s.setObject(1,id);try(var r=s.executeQuery()){r.next();return r.getLong(1);}}
    }
    @Test void trabalhadorCriaEmpresaEReexecucaoNaoDuplicaNemReativa() throws Exception {
        UUID id=UUID.randomUUID();var pedido=pedido(id);assertThat(criar(pedido).getResponse().getStatus()).isEqualTo(202);
        var service=new ProvisionamentoService(System.getenv());var resultado=service.processarSolicitacao(id);
        assertThat(resultado.estado()).isEqualTo("ATIVO");
        assertThat(mapper.readTree(consultar(id).getResponse().getContentAsString()).get("estado").asText()).isEqualTo("CONCLUIDO");
        assertThat(service.processarSolicitacao(id)).isEqualTo(resultado);
        try(var c=owner();var s=c.createStatement()) {
            try(var r=s.executeQuery("select count(*) from "+resultado.schema()+".usuario where perfil='ADMINISTRADOR'")){r.next();assertThat(r.getLong(1)).isEqualTo(1);}
            try(var r=s.executeQuery("select senha_hash from "+resultado.schema()+".usuario")){r.next();assertThat(new BCryptPasswordEncoder().matches((String)pedido.get("senha"),r.getString(1))).isTrue();}
            s.execute("update public.empresa set estado='SUSPENSO' where id='"+id+"'");
        }
        assertThat(service.processarSolicitacao(id).estado()).isEqualTo("SUSPENSO");
        assertThat(contar("select count(*) from public.auditoria_provisionamento where empresa_id=? and evento='ATIVADO'",id)).isEqualTo(1);
    }
    @Test void falhaPersistidaRetomaComVersaoSemDuplicar() throws Exception {
        UUID id=UUID.randomUUID();assertThat(criar(pedido(id)).getResponse().getStatus()).isEqualTo(202);
        String constraint="teste_solicitacao_"+id.toString().replace("-","");
        try(var c=owner();var s=c.createStatement()){s.execute("alter table public.auditoria_provisionamento add constraint "+constraint+" check(empresa_id<>'"+id+"'::uuid or evento<>'ATIVADO') not valid");}
        var service=new ProvisionamentoService(System.getenv());
        try {assertThatThrownBy(()->service.processarSolicitacao(id)).isInstanceOf(IllegalStateException.class);}
        finally{try(var c=owner();var s=c.createStatement()){s.execute("alter table public.auditoria_provisionamento drop constraint "+constraint);}}
        var falha=mapper.readTree(consultar(id).getResponse().getContentAsString());assertThat(falha.get("estado").asText()).isEqualTo("FALHOU");
        assertThat(falha.get("ultimaFalha").asText()).isEqualTo("PROVISIONAMENTO_INTERROMPIDO");
        assertThatThrownBy(()->service.processarSolicitacao(id)).isInstanceOf(IllegalStateException.class);
        assertThat(retomar(id,0).getResponse().getStatus()).isEqualTo(409);
        assertThat(retomar(id,falha.get("versao").asLong()).getResponse().getStatus()).isEqualTo(202);
        assertThat(retomar(id,falha.get("versao").asLong()).getResponse().getStatus()).isEqualTo(409);
        assertThat(new ProvisionamentoService(System.getenv()).processarSolicitacao(id).estado()).isEqualTo("ATIVO");
        assertThat(contar("select count(*) from public.auditoria_solicitacao_provisionamento where solicitacao_id=?",id)).isEqualTo(2);
    }
    @Test void rejeitaPayloadDominioOuAutorDivergente() throws Exception {
        UUID id=UUID.randomUUID();var original=pedido(id);assertThat(criar(original).getResponse().getStatus()).isEqualTo(202);
        for(String campo:java.util.List.of("nome","senha","email","unidade")) {
            var outro=new java.util.HashMap<>(original);outro.put(campo,campo.equals("email")?"outro@example.invalid":"Outro valor válido");
            assertThat(criar(outro).getResponse().getStatus()).isEqualTo(409);
        }
        var outro=new java.util.HashMap<>(original);outro.put("id",UUID.randomUUID());assertThat(criar(outro).getResponse().getStatus()).isEqualTo(409);
        autenticar();assertThat(criar(original).getResponse().getStatus()).isEqualTo(409);
        assertThat(contar("select count(*) from public.auditoria_solicitacao_provisionamento where solicitacao_id=?",id)).isEqualTo(1);
    }
    @Test void entradasInvalidasEOrigemOuSessaoInvalidaNaoCriamSolicitacao() throws Exception {
        for(String dominio:java.util.List.of("plataforma.localhost","a.localhost","novo.localhost:8089","novo.example.com")) {
            var p=new java.util.HashMap<>(pedido(UUID.randomUUID()));p.put("host",dominio);
            assertThat(criar(p).getResponse().getStatus()).isIn(400,409);
        }
        var p=new java.util.HashMap<>(pedido(UUID.randomUUID()));p.put("schema","public");assertThat(criar(p).getResponse().getStatus()).isEqualTo(400);
        p.remove("schema");p.put("senha","curta");assertThat(criar(p).getResponse().getStatus()).isEqualTo(400);
        assertThat(consultar(UUID.randomUUID()).getResponse().getStatus()).isEqualTo(404);
        mvc.perform(get(BASE).header("Host",HOST)).andExpect(status().isUnauthorized());
        mvc.perform(get(BASE).header("Host","a.localhost").header("Authorization","Bearer "+token)).andExpect(status().isNotFound());
        try(var c=owner();var s=c.prepareStatement("update public.sessao_plataforma set reautenticada_em=now()-interval '6 minutes' where usuario_id=?")){s.setObject(1,operador);s.executeUpdate();}
        assertThat(criar(pedido(UUID.randomUUID())).getResponse().getStatus()).isEqualTo(403);
        try(var c=owner();var s=c.prepareStatement("update public.usuario_plataforma set ativo=false where id=?")){s.setObject(1,operador);s.executeUpdate();}
        assertThat(criar(pedido(UUID.randomUUID())).getResponse().getStatus()).isEqualTo(401);
    }
    @Test void criacoesSimultaneasMesmoIdTemUmaIntencao() throws Exception {
        UUID id=UUID.randomUUID();var p=pedido(id);var barreira=new java.util.concurrent.CyclicBarrier(2);
        String primeiro=token;novaSessao();String segundo=token;
        try(var executor=java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var a=executor.submit(()->{barreira.await();return criar(p,primeiro).getResponse().getStatus();});
            var b=executor.submit(()->{barreira.await();return criar(p,segundo).getResponse().getStatus();});
            assertThat(java.util.List.of(a.get(30,java.util.concurrent.TimeUnit.SECONDS),b.get(30,java.util.concurrent.TimeUnit.SECONDS))).containsExactly(202,202);
        }
        assertThat(contar("select count(*) from public.solicitacao_provisionamento where id=?",id)).isEqualTo(1);
        assertThat(contar("select count(*) from public.auditoria_solicitacao_provisionamento where solicitacao_id=?",id)).isEqualTo(1);
    }
    @Test void auditoriaFalhaReverteSolicitacaoSemReservaParcial() throws Exception {
        UUID id=UUID.randomUUID();String constraint="teste_pedido_"+id.toString().replace("-","");
        try(var c=owner();var s=c.createStatement()){s.execute("alter table public.auditoria_solicitacao_provisionamento add constraint "+constraint+" check(solicitacao_id<>'"+id+"'::uuid) not valid");}
        try{assertThat(criar(pedido(id)).getResponse().getStatus()).isEqualTo(500);}
        finally{try(var c=owner();var s=c.createStatement()){s.execute("alter table public.auditoria_solicitacao_provisionamento drop constraint "+constraint);}}
        assertThat(contar("select count(*) from public.solicitacao_provisionamento where id=?",id)).isZero();
    }
    @Test void cliLegadoNaoTomaReservaDaApiNemCriaHashDivergente() throws Exception {
        UUID id=UUID.randomUUID();var p=pedido(id);assertThat(criar(p).getResponse().getStatus()).isEqualTo(202);
        var service=new ProvisionamentoService(System.getenv());
        for(UUID tentativa:java.util.List.of(id,UUID.randomUUID())) {
            var cli=new ProvisionamentoService.Pedido(tentativa,(String)p.get("nome"),(String)p.get("host"),(String)p.get("unidade"),(String)p.get("email"),(String)p.get("senha"));
            assertThatThrownBy(()->service.reservar(cli)).isInstanceOf(IllegalStateException.class).hasMessage("Reserva pertence à fila SaaS; processe a solicitação original.");
        }
        assertThat(service.processarSolicitacao(id).estado()).isEqualTo("ATIVO");
    }
    @Test void interrupcaoAposAtivarReconciliaSemReativarEmpresaSuspensa() throws Exception {
        UUID id=UUID.randomUUID();assertThat(criar(pedido(id)).getResponse().getStatus()).isEqualTo(202);
        var service=new ProvisionamentoService(System.getenv());service.processarSolicitacao(id);
        // Reproduz janela durável: ativação confirmada e confirmação da fila não gravada.
        try(var c=owner();var s=c.createStatement()) {
            s.execute("update public.solicitacao_provisionamento set estado='SOLICITADO' where id='"+id+"'");
            s.execute("update public.empresa set estado='SUSPENSO' where id='"+id+"'");
        }
        assertThat(new ProvisionamentoService(System.getenv()).processarSolicitacao(id).estado()).isEqualTo("SUSPENSO");
        assertThat(mapper.readTree(consultar(id).getResponse().getContentAsString()).get("estado").asText()).isEqualTo("CONCLUIDO");
        assertThat(contar("select count(*) from public.auditoria_provisionamento where empresa_id=? and evento='ATIVADO'",id)).isEqualTo(1);
    }
}
