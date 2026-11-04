package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

import br.com.restaurantmanager.tenancy.Migrations;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
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
class AcessosTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired br.com.restaurantmanager.identidade.AcessosService acessos;
    @Autowired br.com.restaurantmanager.unidades.ConfiguracaoUnidadeService configuracaoUnidade;
    @Autowired org.springframework.transaction.PlatformTransactionManager transactions;
    private final List<UUID> criados = new ArrayList<>();
    private final String senha = UUID.randomUUID().toString();
    private UUID admin;
    private String token;
    private final UUID empresa = UUID.randomUUID();
    private final String schema = "t_"+empresa.toString().replace("-", "");
    private final String host = "acesso-"+empresa+".localhost";
    private static final UUID U1 = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final UUID U2 = UUID.fromString("22222222-2222-2222-2222-222222222222");
    @BeforeAll static void preparar() throws Exception { TestDatabase.prepare(); }
    private Connection banco() throws Exception {
        var c = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
        Migrations.verifyIdentity(c,"rm_test","rm_test_owner"); return c;
    }
    @BeforeEach void conta() throws Exception {
        TestDatabase.migrate(schema,"tenant");
        try(var c=banco();var s=c.createStatement()) {
            s.execute("insert into public.empresa(id,nome,schema_name,estado) values ('"+empresa+"','Acessos fictícios','"+schema+"','ATIVO')");
            s.execute("insert into public.dominio(host,empresa_id) values ('"+host+"','"+empresa+"')");
            s.execute("insert into "+schema+".unidade(id,nome) values ('"+U1+"','A1'),('"+U2+"','A2')");
        }
        admin = criar("ADMINISTRADOR"); token = login(admin);
    }
    private UUID criar(String perfil) throws Exception {
        UUID id = UUID.randomUUID(); criados.add(id);
        try (var c = banco(); var s = c.prepareStatement("insert into " + schema + ".usuario(id,email,senha_hash,perfil,email_verificado) values (?,?,?,?,true)")) {
            s.setObject(1,id); s.setString(2,id+"@example.invalid"); s.setString(3,new BCryptPasswordEncoder(12).encode(senha)); s.setString(4,perfil); s.executeUpdate();
        }
        return id;
    }
    private String login(UUID id) throws Exception {
        return login(id,host);
    }
    private String login(UUID id,String dominio) throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf").header("Host",dominio)).andReturn().getResponse();
        var data = mapper.readTree(csrf.getContentAsString());
        var result = mvc.perform(post("/api/v1/auth/login").header("Host",dominio).cookie(csrf.getCookie("__Host-RM_CSRF"))
                .header(data.get("headerName").asText(),data.get("token").asText()).with(r -> {r.setRemoteAddr("2001:db8:"+id.toString().substring(0,4)+"::1"); return r;})
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("email",id+"@example.invalid","senha",senha)))).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return mapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }
    private MvcResult consultar(String access,String path) throws Exception {
        return mvc.perform(get(path).header("Host",host).header("Authorization","Bearer "+access)).andReturn();
    }
    private MvcResult alterar(String access,String path,Object body) throws Exception {
        return mvc.perform(put(path).header("Host",host).header("Authorization","Bearer "+access)
                .contentType("application/json").content(mapper.writeValueAsString(body))).andReturn();
    }
    private void reautenticar(String access) throws Exception {
        var result = mvc.perform(post("/api/v1/auth/reautenticar").header("Host",host).header("Authorization","Bearer "+access)
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("senha",senha)))).andReturn();
        assertThat(result.getResponse().getStatus()).isEqualTo(204);
    }
    private Map<String,Object> vinculo(String perfil,boolean ativo,long versao,Set<UUID> unidades) { return Map.of("perfil",perfil,"ativo",ativo,"versao",versao,"unidades",unidades); }
    @AfterEach void limparSomenteMassaPropria() throws Exception {
        try (var c=banco();var s=c.createStatement()) {
            s.execute("delete from public.dominio where empresa_id='"+empresa+"'");
            s.execute("delete from public.empresa where id='"+empresa+"'");
            s.execute("drop schema if exists "+schema+" cascade");
        }
    }
    private MvcResult criarUnidade(String access,UUID id,String nome,String fuso,boolean ativa) throws Exception {
        return mvc.perform(post("/api/v1/configuracoes/unidades").header("Host",host).header("Authorization","Bearer "+access)
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("id",id,"nome",nome,"fuso",fuso,"ativa",ativa)))).andReturn();
    }
    private String eventos(UUID unidade,long depois) { return "/api/v1/operacao/unidades/"+unidade+"/eventos?depois="+depois; }
    @Test void eventosDuraveisProjetamSomenteUnidadeEReenvioNaoDuplica() throws Exception {
        assertThat(consultar(token,eventos(U1,-1)).getResponse().getStatus()).isEqualTo(200);
        reautenticar(token);UUID id=UUID.randomUUID();
        assertThat(criarUnidade(token,id,"Unidade monitorada","UTC",true).getResponse().getStatus()).isEqualTo(200);
        assertThat(criarUnidade(token,id,"Unidade monitorada","UTC",true).getResponse().getStatus()).isEqualTo(200);
        assertThat(alterar(token,"/api/v1/configuracoes/unidades/"+id,Map.of("versao",0,"nome","Unidade monitorada","fuso","UTC","ativa",true)).getResponse().getStatus()).isEqualTo(200);
        assertThat(alterar(token,"/api/v1/configuracoes/unidades/"+id,Map.of("versao",0,"nome","Nome atualizado","fuso","UTC","ativa",true)).getResponse().getStatus()).isEqualTo(200);
        var response=consultar(token,eventos(id,-1)).getResponse();
        assertThat(response.getStatus()).isEqualTo(200);
        var body=mapper.readTree(response.getContentAsString());
        assertThat(body.get("eventos").size()).isEqualTo(2);
        assertThat(body.get("proximo").asText()).isEqualTo("1");
        assertThat(body.get("temMais").asBoolean()).isFalse();
        assertThat(body.get("eventos").get(0).get("tipo").asText()).isEqualTo("UNIDADE_CRIADA");
        assertThat(body.get("eventos").get(1).get("nome").asText()).isEqualTo("Nome atualizado");
        assertThat(response.getContentAsString()).doesNotContain("email","senha","ator","payload","schema","criacaoPayload");
        assertThat(mapper.readTree(consultar(token,eventos(id,1)).getResponse().getContentAsString()).get("eventos").size()).isZero();
        assertThat(consultar(token,eventos(id,-2)).getResponse().getStatus()).isEqualTo(400);
        assertThat(consultar(token,eventos(id,99)).getResponse().getStatus()).isEqualTo(409);
        assertThat(consultar(token,eventos(U2,-1)).getResponse().getContentAsString()).doesNotContain("Nome atualizado");
        assertThat(mvc.perform(get(eventos(id,-1)).header("Host","b.localhost").header("Authorization","Bearer "+token)).andReturn().getResponse().getStatus()).isEqualTo(401);
    }
    @Test void eventosRevalidamTodosPerfisPermissaoVinculoESessaoComMesmoJwt() throws Exception {
        reautenticar(token);long politica=0;
        for(String perfil:List.of("GERENTE","ATENDIMENTO","CAIXA","COZINHA","EXPEDICAO")) {
            UUID id=criar(perfil);String access=login(id);
            assertThat(alterar(token,"/api/v1/equipe/"+id,vinculo(perfil,true,0,Set.of(U1))).getResponse().getStatus()).isEqualTo(200);
            assertThat(consultar(access,eventos(U1,-1)).getResponse().getStatus()).isEqualTo(200);
            assertThat(consultar(access,eventos(U2,-1)).getResponse().getStatus()).isEqualTo(404);
            assertThat(alterar(token,"/api/v1/configuracoes/acessos",Map.of("versao",politica++,"perfil",perfil,"acoes",List.of())).getResponse().getStatus()).isEqualTo(200);
            assertThat(consultar(access,eventos(U1,-1)).getResponse().getStatus()).isEqualTo(403);
            assertThat(alterar(token,"/api/v1/configuracoes/acessos",Map.of("versao",politica++,"perfil",perfil,"acoes",List.of("unidade.acompanhar"))).getResponse().getStatus()).isEqualTo(200);
            assertThat(consultar(access,eventos(U1,-1)).getResponse().getStatus()).isEqualTo(200);
            assertThat(alterar(token,"/api/v1/equipe/"+id,vinculo(perfil,true,1,Set.of(U2))).getResponse().getStatus()).isEqualTo(200);
            assertThat(consultar(access,eventos(U1,-1)).getResponse().getStatus()).isEqualTo(404);
            assertThat(alterar(token,"/api/v1/equipe/"+id,vinculo(perfil,false,2,Set.of(U2))).getResponse().getStatus()).isEqualTo(200);
            assertThat(consultar(access,eventos(U2,-1)).getResponse().getStatus()).isEqualTo(401);
        }
        assertThat(consultar(login(criar("CLIENTE")),eventos(U1,-1)).getResponse().getStatus()).isEqualTo(403);
    }
    @Test void eventosPaginamSemPerdaENegamUnidadeInativa() throws Exception {
        reautenticar(token);UUID id=UUID.randomUUID();criarUnidade(token,id,"Paginação","UTC",true);
        for(int i=0;i<51;i++) assertThat(alterar(token,"/api/v1/configuracoes/unidades/"+id,Map.of("versao",i,"nome","Versão "+i,"fuso","UTC","ativa",true)).getResponse().getStatus()).isEqualTo(200);
        var first=mapper.readTree(consultar(token,eventos(id,-1)).getResponse().getContentAsString());
        assertThat(first.get("eventos").size()).isEqualTo(50);assertThat(first.get("temMais").asBoolean()).isTrue();assertThat(first.get("proximo").asText()).isEqualTo("49");
        var next=mapper.readTree(consultar(token,eventos(id,49)).getResponse().getContentAsString());
        assertThat(next.get("eventos").size()).isEqualTo(2);assertThat(next.get("proximo").asText()).isEqualTo("51");assertThat(next.get("temMais").asBoolean()).isFalse();
        assertThat(alterar(token,"/api/v1/configuracoes/unidades/"+id,Map.of("versao",51,"nome","Inativa","fuso","UTC","ativa",false)).getResponse().getStatus()).isEqualTo(200);
        assertThat(consultar(token,eventos(id,51)).getResponse().getStatus()).isEqualTo(404);
    }
    @Test void falhaDoEventoReverteUnidadeEAuditoria() throws Exception {
        reautenticar(token);UUID id=UUID.randomUUID();String constraint="teste_evento_"+id.toString().replace("-","");
        try(var c=banco();var s=c.createStatement()){s.execute("alter table "+schema+".evento_unidade add constraint "+constraint+" check(unidade_id<>'"+id+"'::uuid)");}
        try{assertThat(criarUnidade(token,id,"Reverter","UTC",true).getResponse().getStatus()).isEqualTo(500);}
        finally{try(var c=banco();var s=c.createStatement()){s.execute("alter table "+schema+".evento_unidade drop constraint "+constraint);}}
        assertThat(consultar(token,"/api/v1/configuracoes/unidades/"+id).getResponse().getStatus()).isEqualTo(404);
        try(var c=banco();var s=c.createStatement();var r=s.executeQuery("select count(*) from "+schema+".auditoria_acesso where recurso_id='"+id+"'")){r.next();assertThat(r.getLong(1)).isZero();}
    }
    @Test void eventosAguardamEscritorERevalidamRevogacaoDepoisDoLock() throws Exception {
        UUID id=criar("COZINHA");String access=login(id);reautenticar(token);
        alterar(token,"/api/v1/equipe/"+id,vinculo("COZINHA",true,0,Set.of(U1)));
        try(var c=banco();var pool=Executors.newSingleThreadExecutor()) {
            c.setAutoCommit(false);
            try(var s=c.createStatement()){s.execute("select id from "+schema+".politica_acesso where id=1 for update");}
            var started=new java.util.concurrent.CountDownLatch(1);
            var future=pool.submit(()->{started.countDown();return consultar(access,eventos(U1,-1)).getResponse().getStatus();});
            try {
                assertThat(started.await(5,TimeUnit.SECONDS)).isTrue();
                org.assertj.core.api.Assertions.assertThatThrownBy(()->future.get(1,TimeUnit.SECONDS)).isInstanceOf(java.util.concurrent.TimeoutException.class);
                try(var s=c.createStatement()){s.execute("delete from "+schema+".permissao_perfil where perfil='COZINHA' and acao='unidade.acompanhar'");}
            }finally{c.commit();}
            assertThat(future.get(20,TimeUnit.SECONDS)).isEqualTo(403);
        }
    }
    @Test void eventosNaoPulamEscritaNaoConfirmadaNemPublicamRollback() throws Exception {
        reautenticar(token);UUID id=UUID.randomUUID();criarUnidade(token,id,"Inicial","UTC",true);
        var principal=mapper.readValue(consultar(token,"/api/v1/auth/me").getResponse().getContentAsString(),br.com.restaurantmanager.identidade.IdentidadeAtual.class);
        for(boolean rollback:List.of(true,false)) {
            var gravou=new java.util.concurrent.CountDownLatch(1);var liberar=new java.util.concurrent.CountDownLatch(1);
            try(var pool=Executors.newFixedThreadPool(2)) {
                var writer=pool.submit(()->{
                    try(var scope=br.com.restaurantmanager.tenancy.TenantScope.open(schema)) {
                        new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(status->{
                            configuracaoUnidade.alterar(principal,id,0,"Confirmada","UTC",true);gravou.countDown();
                            try {if(!liberar.await(10,TimeUnit.SECONDS))throw new IllegalStateException("Leitor não liberou escritor.");}
                            catch(InterruptedException e){Thread.currentThread().interrupt();throw new IllegalStateException(e);}
                            if(rollback)status.setRollbackOnly();
                        });
                    }
                });
                assertThat(gravou.await(10,TimeUnit.SECONDS)).isTrue();
                var reader=pool.submit(()->consultar(token,eventos(id,0)));
                try{org.assertj.core.api.Assertions.assertThatThrownBy(()->reader.get(1,TimeUnit.SECONDS)).isInstanceOf(java.util.concurrent.TimeoutException.class);}
                finally{liberar.countDown();}
                writer.get(20,TimeUnit.SECONDS);var response=reader.get(20,TimeUnit.SECONDS).getResponse();assertThat(response.getStatus()).isEqualTo(200);
                var body=mapper.readTree(response.getContentAsString());assertThat(body.get("eventos").size()).isEqualTo(rollback?0:1);
                assertThat(body.get("proximo").asText()).isEqualTo(rollback?"0":"1");
                assertThat(body.get("unidade").get("nome").asText()).isEqualTo(rollback?"Inicial":"Confirmada");
            }
        }
    }
    @Test void eventosComMesmoUuidEIdentidadesValidasIsolamDoisTenants() throws Exception {
        UUID outra=UUID.randomUUID();String outroSchema="t_"+outra.toString().replace("-","");String outroHost="evento-"+outra+".localhost";
        TestDatabase.migrate(outroSchema,"tenant");
        try {
            try(var c=banco();var s=c.createStatement()) {
                s.execute("insert into public.empresa(id,nome,schema_name,estado) values ('"+outra+"','Outra empresa','"+outroSchema+"','ATIVO')");
                s.execute("insert into public.dominio(host,empresa_id) values ('"+outroHost+"','"+outra+"')");
                s.execute("insert into "+outroSchema+".unidade(id,nome) values ('"+U1+"','Somente B')");
                s.execute("insert into "+outroSchema+".usuario(id,email,senha_hash,perfil,email_verificado) select id,email,senha_hash,perfil,email_verificado from "+schema+".usuario where id='"+admin+"'");
                s.execute("insert into "+outroSchema+".evento_unidade(id,unidade_id,versao,tipo,nome,fuso,ativa,ocorrido_em) values ('"+UUID.randomUUID()+"','"+U1+"',0,'UNIDADE_CRIADA','Somente B','UTC',true,now())");
            }
            String other=login(admin,outroHost);
            var b=mvc.perform(get(eventos(U1,-1)).header("Host",outroHost).header("Authorization","Bearer "+other)).andReturn().getResponse();
            assertThat(b.getStatus()).isEqualTo(200);assertThat(b.getContentAsString()).contains("Somente B").doesNotContain("A1");
            var a=consultar(token,eventos(U1,-1)).getResponse();assertThat(a.getStatus()).isEqualTo(200);assertThat(a.getContentAsString()).contains("A1").doesNotContain("Somente B");
        }finally{
            try(var c=banco();var s=c.createStatement()){s.execute("delete from public.dominio where empresa_id='"+outra+"'");s.execute("delete from public.empresa where id='"+outra+"'");s.execute("drop schema "+outroSchema+" cascade");}
        }
    }
    @Test void unidadesExigemAdminReautenticacaoEValidacaoSemElevarPrivilegios() throws Exception {
        UUID id=UUID.randomUUID();
        assertThat(criarUnidade(token,id,"Nova unidade","America/Sao_Paulo",true).getResponse().getStatus()).isEqualTo(403);
        reautenticar(token);
        assertThat(criarUnidade(token,id,"   ","America/Sao_Paulo",true).getResponse().getStatus()).isEqualTo(400);
        assertThat(criarUnidade(token,id,"Nova unidade","Fuso/Inexistente",true).getResponse().getStatus()).isEqualTo(422);
        for(String perfil:List.of("GERENTE","ATENDIMENTO","CAIXA","COZINHA","EXPEDICAO","CLIENTE")) {
            String other=login(criar(perfil));
            assertThat(consultar(other,"/api/v1/configuracoes/unidades").getResponse().getStatus()).isEqualTo(403);
            assertThat(criarUnidade(other,id,"Nova unidade","America/Sao_Paulo",true).getResponse().getStatus()).isEqualTo(403);
            assertThat(alterar(other,"/api/v1/configuracoes/unidades/"+U1,Map.of("versao",0,"nome","Mudada","fuso","UTC","ativa",true)).getResponse().getStatus()).isEqualTo(403);
        }
        assertThat(criarUnidade(token,id,"Nova unidade","America/Sao_Paulo",true).getResponse().getStatus()).isEqualTo(200);
        assertThat(mvc.perform(get("/api/v1/configuracoes/unidades/"+id).header("Host","b.localhost").header("Authorization","Bearer "+token)).andReturn().getResponse().getStatus()).isEqualTo(401);
        assertThat(consultar(token,"/api/v1/configuracoes/unidades/"+UUID.randomUUID()).getResponse().getStatus()).isEqualTo(404);
        assertThat(consultar(token,"/api/v1/configuracoes/unidades?pagina=-1").getResponse().getStatus()).isEqualTo(400);
    }
    @Test void criacaoUnidadeIdempotenteMesmoAposEdicaoENaoDuplicaAuditoria() throws Exception {
        reautenticar(token); UUID id=UUID.randomUUID();
        assertThat(criarUnidade(token,id,"Nova","UTC",true).getResponse().getStatus()).isEqualTo(200);
        assertThat(criarUnidade(token,id,"Nova","UTC",true).getResponse().getStatus()).isEqualTo(200);
        assertThat(criarUnidade(token,id,"Outra","UTC",true).getResponse().getStatus()).isEqualTo(409);
        assertThat(alterar(token,"/api/v1/configuracoes/unidades/"+id,Map.of("versao",0,"nome","Editada","fuso","America/Manaus","ativa",true)).getResponse().getStatus()).isEqualTo(200);
        var replay=criarUnidade(token,id,"Nova","UTC",true);
        assertThat(replay.getResponse().getStatus()).isEqualTo(200);
        assertThat(replay.getResponse().getContentAsString()).contains("Editada").doesNotContain("criacao","hash");
        try(var c=banco();var s=c.prepareStatement("select count(*) from "+schema+".auditoria_acesso where recurso_id=?")) {
            s.setObject(1,id);try(var r=s.executeQuery()){r.next();assertThat(r.getInt(1)).isEqualTo(2);}
        }
    }
    @Test void inativarUnidadeRetiraAcessoComMesmoJwtEPreservaCadastro() throws Exception {
        UUID worker=criar("COZINHA");String access=login(worker);reautenticar(token);
        assertThat(alterar(token,"/api/v1/equipe/"+worker,vinculo("COZINHA",true,0,Set.of(U1))).getResponse().getStatus()).isEqualTo(200);
        assertThat(consultar(access,"/api/v1/operacao/unidades/"+U1).getResponse().getStatus()).isEqualTo(200);
        var edit=alterar(token,"/api/v1/configuracoes/unidades/"+U1,Map.of("versao",0,"nome","A1","fuso","America/Sao_Paulo","ativa",false));
        assertThat(edit.getResponse().getStatus()).isEqualTo(200);
        assertThat(consultar(access,"/api/v1/operacao/unidades/"+U1).getResponse().getStatus()).isEqualTo(404);
        assertThat(mvc.perform(get("/api/v1/unidades").header("Host",host)).andReturn().getResponse().getContentAsString()).doesNotContain(U1.toString());
        assertThat(consultar(token,"/api/v1/configuracoes/unidades/"+U1).getResponse().getContentAsString()).contains("\"ativa\":false");
        assertThat(alterar(token,"/api/v1/configuracoes/unidades/"+U1,Map.of("versao",1,"nome","A1","fuso","America/Sao_Paulo","ativa",true)).getResponse().getStatus()).isEqualTo(200);
        assertThat(consultar(access,"/api/v1/operacao/unidades/"+U1).getResponse().getStatus()).isEqualTo(200);
    }
    @Test void unidadesCriacaoEEdicaoConcorrentesTemResultadoUnico() throws Exception {
        reautenticar(token);UUID id=UUID.randomUUID();var start=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Integer> create=()->{start.await(10,TimeUnit.SECONDS);return criarUnidade(token,id,"Concorrente","UTC",true).getResponse().getStatus();};
            var a=pool.submit(create);var b=pool.submit(create);
            assertThat(List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS))).containsExactly(200,200);
            java.util.concurrent.Callable<Integer> edit=()->{start.await(10,TimeUnit.SECONDS);return alterar(token,"/api/v1/configuracoes/unidades/"+id,Map.of("versao",0,"nome","Alterada","fuso","UTC","ativa",false)).getResponse().getStatus();};
            var c=pool.submit(edit);var d=pool.submit(edit);
            assertThat(List.of(c.get(30,TimeUnit.SECONDS),d.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        try(var c=banco();var s=c.prepareStatement("select count(*) from "+schema+".auditoria_acesso where recurso_id=?")) {
            s.setObject(1,id);try(var r=s.executeQuery()){r.next();assertThat(r.getInt(1)).isEqualTo(2);}
        }
    }
    @Test void matrizExclusivaAdminSemVazarSegredosOuOutroTenant() throws Exception {
        var response=consultar(token,"/api/v1/configuracoes/acessos");
        assertThat(response.getResponse().getStatus()).isEqualTo(200);
        var body=mapper.readTree(response.getResponse().getContentAsString());
        assertThat(body.get("acoes").size()).isGreaterThan(15);
        assertThat(body.get("perfis").size()).isEqualTo(5);
        assertThat(response.getResponse().getContentAsString()).doesNotContain("senhaHash","senha_hash");
        for(String role:List.of("GERENTE","ATENDIMENTO","CAIXA","COZINHA","EXPEDICAO","CLIENTE")) {
            String other=login(criar(role));
            assertThat(consultar(other,"/api/v1/configuracoes/acessos").getResponse().getStatus()).isEqualTo(403);
            assertThat(consultar(other,"/api/v1/equipe").getResponse().getStatus()).isEqualTo(403);
        }
        assertThat(mvc.perform(get("/api/v1/configuracoes/acessos").header("Host","b.localhost").header("Authorization","Bearer "+token)).andReturn().getResponse().getStatus()).isEqualTo(401);
    }
    @Test void edicaoExigeReautenticacaoEProtegeUltimoAdministrador() throws Exception {
        String path="/api/v1/equipe/"+admin;
        assertThat(alterar(token,path,vinculo("GERENTE",true,0,Set.of(U1))).getResponse().getStatus()).isEqualTo(403);
        reautenticar(token);
        assertThat(alterar(token,path,vinculo("GERENTE",true,0,Set.of(U1))).getResponse().getStatus()).isEqualTo(409);
        assertThat(alterar(token,path,vinculo("ADMINISTRADOR",false,0,Set.of())).getResponse().getStatus()).isEqualTo(409);
        assertThat(alterar(token,path,vinculo("CLIENTE",true,0,Set.of())).getResponse().getStatus()).isEqualTo(400);
        assertThat(consultar(token,"/api/v1/equipe").getResponse().getContentAsString()).doesNotContain("senha","refreshToken");
    }
    @Test void unidadesERevogacaoValemComMesmoJwtESessao() throws Exception {
        UUID employee=criar("COZINHA"); String worker=login(employee); reautenticar(token);
        String path="/api/v1/equipe/"+employee;
        assertThat(alterar(token,path,vinculo("COZINHA",true,0,Set.of(U1))).getResponse().getStatus()).isEqualTo(200);
        var units=consultar(worker,"/api/v1/operacao/unidades");
        assertThat(units.getResponse().getStatus()).isEqualTo(200);
        assertThat(units.getResponse().getContentAsString()).contains(U1.toString()).doesNotContain(U2.toString());
        assertThat(consultar(worker,"/api/v1/operacao/unidades/"+U2).getResponse().getStatus()).isEqualTo(404);
        assertThat(consultar(token,"/api/v1/operacao/unidades/"+U2).getResponse().getStatus()).isEqualTo(200);
        assertThat(alterar(token,path,vinculo("COZINHA",true,1,Set.of(U2))).getResponse().getStatus()).isEqualTo(200);
        assertThat(consultar(worker,"/api/v1/operacao/unidades/"+U1).getResponse().getStatus()).isEqualTo(404);
        assertThat(consultar(worker,"/api/v1/operacao/unidades/"+U2).getResponse().getStatus()).isEqualTo(200);
        assertThat(alterar(token,path,vinculo("COZINHA",false,2,Set.of(U2))).getResponse().getStatus()).isEqualTo(200);
        assertThat(consultar(worker,"/api/v1/operacao/unidades").getResponse().getStatus()).isEqualTo(401);
        assertThat(alterar(token,path,vinculo("COZINHA",true,3,Set.of(U2))).getResponse().getStatus()).isEqualTo(200);
        assertThat(consultar(worker,"/api/v1/operacao/unidades").getResponse().getStatus()).isEqualTo(401);
    }
    @Test void matrizConflitaSobConcorrenciaENaoPermiteAcaoDesconhecida() throws Exception {
        reautenticar(token);
        var matrix=mapper.readTree(consultar(token,"/api/v1/configuracoes/acessos").getResponse().getContentAsString());
        long version=matrix.get("versao").asLong();
        Map<String,Object> body=Map.of("versao",version,"perfil","COZINHA","acoes",List.of("cozinha.iniciar"));
        var start=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Integer> task=()->{start.await(10,TimeUnit.SECONDS);return alterar(token,"/api/v1/configuracoes/acessos",body).getResponse().getStatus();};
            var a=pool.submit(task);var b=pool.submit(task);
            assertThat(List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        var updated=mapper.readTree(consultar(token,"/api/v1/configuracoes/acessos").getResponse().getContentAsString());
        assertThat(updated.get("versao").asLong()).isEqualTo(version+1);
        assertThat(updated.get("perfis").get("COZINHA").toString()).contains("pedido.consultar","cozinha.iniciar");
        assertThat(alterar(token,"/api/v1/configuracoes/acessos",Map.of("versao",version+1,"perfil","COZINHA","acoes",List.of("equipe.editar"))).getResponse().getStatus()).isEqualTo(400);
        assertThat(alterar(token,"/api/v1/configuracoes/acessos",Map.of("versao",version+1,"perfil","ADMINISTRADOR","acoes",List.of())).getResponse().getStatus()).isEqualTo(400);
        assertThat(alterar(token,"/api/v1/configuracoes/acessos",Map.of("versao",version+1,"perfil","COZINHA","acoes",List.of("catalogo.consultar","pedido.consultar","cozinha.iniciar","cozinha.concluir"))).getResponse().getStatus()).isEqualTo(200);
    }
    @Test void revogacaoDaMatrizAfetaAutorizacaoCentralComJwtValido() throws Exception {
        UUID id=criar("COZINHA");String access=login(id);reautenticar(token);
        assertThat(alterar(token,"/api/v1/equipe/"+id,vinculo("COZINHA",true,0,Set.of(U1))).getResponse().getStatus()).isEqualTo(200);
        var principal=mapper.readValue(consultar(access,"/api/v1/auth/me").getResponse().getContentAsString(),br.com.restaurantmanager.identidade.IdentidadeAtual.class);
        try(var scope=br.com.restaurantmanager.tenancy.TenantScope.open(schema)) {
            new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(s->acessos.autorizar(principal,br.com.restaurantmanager.identidade.Acao.COZINHA_INICIAR,U1));
            org.assertj.core.api.Assertions.assertThatThrownBy(()->new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(s->acessos.autorizar(principal,br.com.restaurantmanager.identidade.Acao.COZINHA_INICIAR,U2))).isInstanceOf(br.com.restaurantmanager.identidade.AuthFailure.class);
        }
        assertThat(alterar(token,"/api/v1/configuracoes/acessos",Map.of("versao",0,"perfil","COZINHA","acoes",List.of())).getResponse().getStatus()).isEqualTo(200);
        assertThat(mapper.readTree(consultar(access,"/api/v1/acessos/efetivos").getResponse().getContentAsString()).get("acoes").size()).isZero();
        try(var scope=br.com.restaurantmanager.tenancy.TenantScope.open(schema)) {
            org.assertj.core.api.Assertions.assertThatThrownBy(()->new org.springframework.transaction.support.TransactionTemplate(transactions).executeWithoutResult(s->acessos.autorizar(principal,br.com.restaurantmanager.identidade.Acao.COZINHA_INICIAR,U1))).isInstanceOf(br.com.restaurantmanager.identidade.AuthFailure.class);
        }
        try(var c=banco();var s=c.createStatement();var r=s.executeQuery("select count(*),bool_and(antes<>depois) from "+schema+".auditoria_acesso")) {r.next();assertThat(r.getInt(1)).isEqualTo(2);assertThat(r.getBoolean(2)).isTrue();}
    }
    @Test void reautenticacaoExpiraELimiteNaoPodeSerContornado() throws Exception {
        reautenticar(token);
        try(var c=banco();var s=c.createStatement()) {s.execute("update "+schema+".sessao set reautenticada_em=now()-interval '6 minutes'");}
        assertThat(alterar(token,"/api/v1/equipe/"+admin,vinculo("ADMINISTRADOR",true,0,Set.of())).getResponse().getStatus()).isEqualTo(403);
        for(int i=0;i<6;i++) {
            var result=mvc.perform(post("/api/v1/auth/reautenticar").header("Host",host).header("Authorization","Bearer "+token).contentType("application/json").content(mapper.writeValueAsString(Map.of("senha","incorreta")))).andReturn();
            assertThat(result.getResponse().getStatus()).isEqualTo(i<5?422:429);
        }
    }
    @Test void loginAguardaLockDaMudancaDeAcesso() throws Exception {
        UUID employee=criar("COZINHA");
        try(var c=banco();var pool=Executors.newSingleThreadExecutor()) {
            c.setAutoCommit(false);
            try(var s=c.createStatement()){s.execute("select id from "+schema+".politica_acesso where id=1 for update");}
            var start=new java.util.concurrent.CountDownLatch(1);
            var future=pool.submit(()->{start.countDown();return login(employee);});
            try {
                assertThat(start.await(5,TimeUnit.SECONDS)).isTrue();
                org.assertj.core.api.Assertions.assertThatThrownBy(()->future.get(3,TimeUnit.SECONDS)).isInstanceOf(java.util.concurrent.TimeoutException.class);
            } finally {c.commit();}
            assertThat(future.get(20,TimeUnit.SECONDS)).isNotBlank();
        }
    }
    @Test void doisAdministradoresNaoPodemRemoverAmbosSimultaneamente() throws Exception {
        UUID other=criar("ADMINISTRADOR"); String otherToken=login(other);
        reautenticar(token);reautenticar(otherToken);
        var start=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var a=pool.submit(()->{start.await(10,TimeUnit.SECONDS);return alterar(token,"/api/v1/equipe/"+admin,vinculo("GERENTE",true,0,Set.of(U1))).getResponse().getStatus();});
            var b=pool.submit(()->{start.await(10,TimeUnit.SECONDS);return alterar(otherToken,"/api/v1/equipe/"+other,vinculo("GERENTE",true,0,Set.of(U1))).getResponse().getStatus();});
            assertThat(List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        try(var c=banco();var s=c.prepareStatement("select count(*) from "+schema+".usuario where id in (?,?) and ativo and perfil='ADMINISTRADOR'")) {
            s.setObject(1,admin);s.setObject(2,other);try(var r=s.executeQuery()){r.next();assertThat(r.getInt(1)).isEqualTo(1);}
        }
    }
}
