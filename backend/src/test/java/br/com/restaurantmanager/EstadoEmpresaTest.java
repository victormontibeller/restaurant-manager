package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.restaurantmanager.plataforma.ProvisionamentoService;
import br.com.restaurantmanager.tenancy.Migrations;
import jakarta.servlet.http.Cookie;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class EstadoEmpresaTest {
    private static final String PLATFORM = "plataforma.localhost";
    private static final String AUTH = "/api/v1/plataforma/auth/";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    private UUID operador;
    private UUID empresa;
    private String email;
    private String senha;
    private String host;

    @BeforeAll static void preparar() throws Exception { TestDatabase.prepare(); }
    @BeforeEach void massa() throws Exception {
        operador=UUID.randomUUID();empresa=UUID.randomUUID();email=operador+"@example.invalid";senha=UUID.randomUUID().toString();host="estado-"+empresa+".localhost";
        try(var c=conexao();var s=c.prepareStatement("insert into public.usuario_plataforma(id,email,senha_hash) values (?,?,?)")) {
            s.setObject(1,operador);s.setString(2,email);s.setString(3,new BCryptPasswordEncoder(12).encode(senha));s.executeUpdate();
        }
        new ProvisionamentoService(System.getenv()).provisionar(new ProvisionamentoService.Pedido(empresa,"Empresa de suspensão",host,"Unidade inicial",email,senha));
    }
    private Connection conexao() throws Exception {
        var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"));
        Migrations.verifyIdentity(c,"rm_test","rm_test_owner");return c;
    }
    private RequestPostProcessor csrf(String dominio,String prefixo,String cookieName) throws Exception {
        var r=mvc.perform(get(prefixo+"csrf").header("Host",dominio)).andExpect(status().isOk()).andReturn().getResponse();
        var b=mapper.readTree(r.getContentAsString());Cookie cookie=r.getCookie(cookieName);
        return request->{request.setCookies(cookie);request.addHeader(b.get("headerName").asText(),b.get("token").asText());return request;};
    }
    private String login(boolean saas) throws Exception {
        String dominio=saas?PLATFORM:host;String prefixo=saas?AUTH:"/api/v1/auth/";
        var r=mvc.perform(post(prefixo+"login").header("Host",dominio).with(csrf(dominio,prefixo,saas?"__Host-RM_PLATFORM_CSRF":"__Host-RM_CSRF"))
                .with(request->{request.setRemoteAddr("2001:db8::"+operador.toString().substring(0,4));return request;})
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("email",email,"senha",senha))))
                .andExpect(status().isOk()).andReturn();
        return mapper.readTree(r.getResponse().getContentAsString()).get("accessToken").asText();
    }
    private MvcResult confirmar(String access,String password) throws Exception {
        return mvc.perform(post(AUTH+"reautenticar").header("Host",PLATFORM).header("Authorization","Bearer "+access)
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("senha",password)))).andReturn();
    }
    private String autorizado() throws Exception { String token=login(true);assertThat(confirmar(token,senha).getResponse().getStatus()).isEqualTo(204);return token; }
    private MvcResult mudar(String access,long versao,String estado,String motivo) throws Exception {
        return mvc.perform(put("/api/v1/plataforma/empresas/"+empresa+"/estado").header("Host",PLATFORM).header("Authorization","Bearer "+access)
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("versao",versao,"estado",estado,"motivo",motivo)))).andReturn();
    }
    private long numero(String sql) throws Exception {try(var c=conexao();var s=c.prepareStatement(sql)){s.setObject(1,empresa);try(var r=s.executeQuery()){r.next();return r.getLong(1);}}}

    @Test void exigeReautenticacaoENaoPromoveEmpresaIncompleta() throws Exception {
        String token=login(true);
        assertThat(mudar(token,1,"SUSPENSO","Revisão comercial").getResponse().getStatus()).isEqualTo(403);
        assertThat(confirmar(token,"incorreta").getResponse().getStatus()).isEqualTo(422);
        mvc.perform(get(AUTH+"me").header("Host",PLATFORM).header("Authorization","Bearer "+token)).andExpect(status().isOk());
        assertThat(confirmar(token,senha).getResponse().getStatus()).isEqualTo(204);
        for(String estado:List.of("PROVISIONANDO","FALHOU")) {
            try(var c=conexao();var s=c.prepareStatement("update public.empresa set estado=? where id=?")){s.setString(1,estado);s.setObject(2,empresa);s.executeUpdate();}
            assertThat(mudar(token,1,"ATIVO","Reativação solicitada").getResponse().getStatus()).isEqualTo(409);
            mvc.perform(get("/api/v1/unidades").header("Host",host)).andExpect(status().isNotFound());
        }
        // Restaurar apenas o registro da massa própria, sem publicar schema incompleto.
        try(var c=conexao();var s=c.prepareStatement("update public.empresa set estado='ATIVO' where id=?")){s.setObject(1,empresa);s.executeUpdate();}
    }
    @Test void suspensaoPreservaSessaoEConsultasEmpresariaisComAuditoria() throws Exception {
        String empresarial=login(false);String token=autorizado();
        var r=mudar(token,1,"SUSPENSO","Revisão comercial");assertThat(r.getResponse().getStatus()).isEqualTo(200);
        var b=mapper.readTree(r.getResponse().getContentAsString());assertThat(b.get("estado").asText()).isEqualTo("SUSPENSO");assertThat(b.get("versao").asLong()).isEqualTo(2);
        assertThat(r.getResponse().getContentAsString()).doesNotContain("schema","senha","motivo");
        mvc.perform(get("/api/v1/auth/me").header("Host",host).header("Authorization","Bearer "+empresarial)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/operacao/unidades").header("Host",host).header("Authorization","Bearer "+empresarial)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/unidades").header("Host",host)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/me").header("Host","b.localhost").header("Authorization","Bearer "+empresarial)).andExpect(status().isUnauthorized());
        var consulta=mvc.perform(get("/api/v1/plataforma/empresas/"+empresa).header("Host",PLATFORM).header("Authorization","Bearer "+token)).andExpect(status().isOk()).andReturn();
        assertThat(mapper.readTree(consulta.getResponse().getContentAsString()).get("estado").asText()).isEqualTo("SUSPENSO");
        assertThat(numero("select count(*) from public.auditoria_estado_empresa where empresa_id=?")).isEqualTo(1);
        assertThat(mudar(token,2,"ATIVO","Regularização comercial").getResponse().getStatus()).isEqualTo(200);
        assertThat(numero("select count(*) from public.auditoria_estado_empresa where empresa_id=?")).isEqualTo(2);
        assertThat(numero("select count(*) from public.auditoria_estado_empresa where empresa_id=? and ((anterior='ATIVO' and novo='SUSPENSO' and versao=2) or (anterior='SUSPENSO' and novo='ATIVO' and versao=3))")).isEqualTo(2);
    }
    @Test void versaoConflitaSemRepetirAuditoriaOuAlterarEstado() throws Exception {
        String token=autorizado();assertThat(mudar(token,1,"SUSPENSO","Pausa comercial").getResponse().getStatus()).isEqualTo(200);
        assertThat(mudar(token,1,"SUSPENSO","Pausa comercial").getResponse().getStatus()).isEqualTo(409);
        assertThat(mudar(token,1,"ATIVO","Edição antiga").getResponse().getStatus()).isEqualTo(409);
        assertThat(mudar(token,2,"SUSPENSO","Sem transição").getResponse().getStatus()).isEqualTo(409);
        assertThat(numero("select count(*) from public.auditoria_estado_empresa where empresa_id=?")).isEqualTo(1);
    }
    @Test void alteracoesSimultaneasTemUmVencedor() throws Exception {
        String a=autorizado();String b=autorizado();var barrier=new CyclicBarrier(2);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var first=executor.submit(()->{barrier.await(10,TimeUnit.SECONDS);return mudar(a,1,"SUSPENSO","Operador A").getResponse().getStatus();});
            var second=executor.submit(()->{barrier.await(10,TimeUnit.SECONDS);return mudar(b,1,"SUSPENSO","Operador B").getResponse().getStatus();});
            assertThat(List.of(first.get(20,TimeUnit.SECONDS),second.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,409);
        }
        assertThat(numero("select count(*) from public.auditoria_estado_empresa where empresa_id=?")).isEqualTo(1);
    }
    @Test void reautenticacaoExpiradaESessaoRevogadaNaoAlteramEmpresa() throws Exception {
        String token=autorizado();
        try(var c=conexao();var s=c.prepareStatement("update public.sessao_plataforma set reautenticada_em=now()-interval '6 minutes' where usuario_id=?")){s.setObject(1,operador);s.executeUpdate();}
        assertThat(mudar(token,1,"SUSPENSO","Pausa comercial").getResponse().getStatus()).isEqualTo(403);
        assertThat(confirmar(token,senha).getResponse().getStatus()).isEqualTo(204);
        try(var c=conexao();var s=c.prepareStatement("update public.usuario_plataforma set ativo=false where id=?")){s.setObject(1,operador);s.executeUpdate();}
        assertThat(mudar(token,1,"SUSPENSO","Pausa comercial").getResponse().getStatus()).isEqualTo(401);
        assertThat(numero("select count(*) from public.auditoria_estado_empresa where empresa_id=?")).isZero();
    }
    @Test void validaCamposMotivoEAutorSemDarPoderAoAdministradorEmpresarial() throws Exception {
        String token=autorizado();
        for(String motivo:List.of(""," ","motivo\ncom controle","x".repeat(241)))assertThat(mudar(token,1,"SUSPENSO",motivo).getResponse().getStatus()).isEqualTo(400);
        for(String estado:List.of("FALHOU","PROVISIONANDO","ATIVO "))assertThat(mudar(token,1,estado,"Pausa comercial").getResponse().getStatus()).isEqualTo(400);
        assertThat(mudar(token,-1,"SUSPENSO","Pausa comercial").getResponse().getStatus()).isEqualTo(400);
        assertThat(mudar(login(false),1,"SUSPENSO","Pausa comercial").getResponse().getStatus()).isEqualTo(401);
        mvc.perform(put("/api/v1/plataforma/empresas/"+empresa+"/estado").header("Host",PLATFORM).header("Authorization","Bearer "+token)
                .contentType("application/json").content("{\"versao\":1,\"estado\":\"SUSPENSO\",\"motivo\":\"Pausa comercial\",\"schema\":\"public\"}")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/v1/plataforma/empresas/"+UUID.randomUUID()).header("Host",PLATFORM).header("Authorization","Bearer "+token)).andExpect(status().isNotFound());
        assertThat(numero("select count(*) from public.auditoria_estado_empresa where empresa_id=?")).isZero();
    }
    @Test void falhaAuditoriaReverteEstadoEVersao() throws Exception {
        String token=autorizado();String constraint="teste_estado_"+empresa.toString().replace("-","");
        try(var c=conexao();var s=c.createStatement()){s.execute("alter table public.auditoria_estado_empresa add constraint "+constraint+" check(empresa_id<>'"+empresa+"'::uuid) not valid");}
        try {
            assertThat(mudar(token,1,"SUSPENSO","Pausa comercial").getResponse().getStatus()).isEqualTo(500);
            assertThat(numero("select count(*) from public.empresa where id=? and estado='ATIVO' and versao=1")).isEqualTo(1);
            assertThat(numero("select count(*) from public.auditoria_estado_empresa where empresa_id=?")).isZero();
        }finally{try(var c=conexao();var s=c.createStatement()){s.execute("alter table public.auditoria_estado_empresa drop constraint "+constraint);}}
        assertThat(mudar(token,1,"SUSPENSO","Pausa comercial").getResponse().getStatus()).isEqualTo(200);
    }
    @Test void inativacaoConcorrenteConfirmadaAntesDaEscritaImpedeSuspensao() throws Exception {
        String token=autorizado();
        try(var pool=Executors.newSingleThreadExecutor();var c=conexao()) {
            c.setAutoCommit(false);
            try(var s=c.prepareStatement("select id from public.usuario_plataforma where id=? for update")){s.setObject(1,operador);s.executeQuery().close();}
            var future=pool.submit(()->mudar(token,1,"SUSPENSO","Pausa comercial").getResponse().getStatus());
            boolean esperando=false;long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(8);
            while(System.nanoTime()<deadline) {
                try(var s=c.createStatement();var r=s.executeQuery("select exists(select 1 from pg_locks where not granted and transactionid in (select transactionid from pg_locks where pid=pg_backend_pid() and locktype='transactionid' and granted))")){r.next();if(r.getBoolean(1)){esperando=true;break;}}
                Thread.sleep(20);
            }
            if(!esperando){c.rollback();throw new AssertionError("Escrita não aguardou lock do operador observado.");}
            try(var s=c.prepareStatement("update public.usuario_plataforma set ativo=false where id=?")){s.setObject(1,operador);s.executeUpdate();}
            c.commit();assertThat(future.get(20,TimeUnit.SECONDS)).isEqualTo(401);
        }
        assertThat(numero("select count(*) from public.empresa where id=? and estado='ATIVO' and versao=1")).isEqualTo(1);
        assertThat(numero("select count(*) from public.auditoria_estado_empresa where empresa_id=?")).isZero();
    }
    @Test void quotaDeReautenticacaoPersisteSemRevogarLogin() throws Exception {
        String token=login(true);for(int i=0;i<5;i++)assertThat(confirmar(token,"incorreta").getResponse().getStatus()).isEqualTo(422);
        assertThat(confirmar(token,senha).getResponse().getStatus()).isEqualTo(429);
        mvc.perform(get(AUTH+"me").header("Host",PLATFORM).header("Authorization","Bearer "+token)).andExpect(status().isOk());
    }
}
