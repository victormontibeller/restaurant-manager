package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import br.com.restaurantmanager.identidade.infrastructure.CapturaEmail;
import br.com.restaurantmanager.identidade.services.EmailIdentidadeService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.Connection;
import java.sql.DriverManager;
import java.util.Base64;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
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
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc(print=MockMvcPrint.NONE)
class ConvitesTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EmailIdentidadeService emails;
    @Autowired CapturaEmail captura;
    private static final Path CAPTURA=diretorio();
    private final UUID empresa=UUID.randomUUID(),admin=UUID.randomUUID(),unidade=UUID.randomUUID();
    private final String schema="t_"+empresa.toString().replace("-","");
    private final String host="convite-"+empresa+".localhost",senha=UUID.randomUUID().toString();
    private String token;
    @DynamicPropertySource static void propriedades(DynamicPropertyRegistry r) {
        byte[] bytes=new byte[32];new SecureRandom().nextBytes(bytes);
        String key=Base64.getEncoder().encodeToString(bytes);
        r.add("rm.email.secret",()->key);r.add("rm.email.capture-directory",()->CAPTURA.toString());
    }
    private static Path diretorio() {
        try{return Files.createTempDirectory(Path.of(System.getenv().getOrDefault("TMPDIR",System.getProperty("java.io.tmpdir"))),"rm-convites-");}
        catch(IOException e){throw new IllegalStateException("Captura privada indisponível.");}
    }
    @BeforeAll static void preparar() throws Exception {TestDatabase.prepare();}
    private Connection banco() throws Exception {
        var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"));
        Migrations.verifyIdentity(c,"rm_test","rm_test_owner");return c;
    }
    @BeforeEach void conta() throws Exception {
        TestDatabase.migrate(schema,"tenant");
        sql("insert into public.empresa(id,nome,schema_name,estado) values (?,'Convites fictícios',?,'ATIVO')",empresa,schema);
        sql("insert into public.dominio(host,empresa_id) values (?,?)",host,empresa);
        sql("insert into "+schema+".unidade(id,nome) values (?,'A1')",unidade);
        criarUsuario(admin,"ADMINISTRADOR");token=login(admin+"@example.invalid",senha);
    }
    private void criarUsuario(UUID id,String perfil) throws Exception {
        sql("insert into "+schema+".usuario(id,email,senha_hash,perfil,email_verificado) values (?,?,?,?,true)",id,id+"@example.invalid",new BCryptPasswordEncoder(12).encode(senha),perfil);
    }
    private void sql(String sql,Object...args) throws Exception {
        try(var c=banco();var s=c.prepareStatement(sql)){for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);s.executeUpdate();}
    }
    private long contar(String tabela,String predicado,Object value) throws Exception {
        try(var c=banco();var s=c.prepareStatement("select count(*) from "+schema+"."+tabela+" where "+predicado)){
            s.setObject(1,value);try(var r=s.executeQuery()){r.next();return r.getLong(1);}
        }
    }
    @AfterEach void limpar() throws Exception {
        sql("delete from public.dominio where empresa_id=?",empresa);sql("delete from public.empresa where id=?",empresa);
        try(var c=banco();var s=c.createStatement()){s.execute("drop schema "+schema+" cascade");}
    }
    private RequestPostProcessor csrf() throws Exception {
        var r=mvc.perform(get("/api/v1/auth/csrf").header("Host",host)).andReturn().getResponse();var b=mapper.readTree(r.getContentAsString());
        return q->{q.setCookies(r.getCookie("__Host-RM_CSRF"));q.addHeader(b.get("headerName").asText(),b.get("token").asText());return q;};
    }
    private MvcResult publico(String rota,String domain,Map<String,Object> body,String origem) throws Exception {
        return mvc.perform(post("/api/v1/auth/"+rota).header("Host",domain).with(csrf()).with(r->{r.setRemoteAddr(origem);return r;})
                .contentType("application/json").content(mapper.writeValueAsString(body))).andReturn();
    }
    private String login(String email,String password) throws Exception {
        var r=publico("login",host,Map.of("email",email,"senha",password),UUID.randomUUID().toString()).getResponse();assertThat(r.getStatus()).isEqualTo(200);
        return mapper.readTree(r.getContentAsString()).get("accessToken").asText();
    }
    private MvcResult comando(String access,String rota,Object body) throws Exception {
        return mvc.perform(post(rota).header("Host",host).header("Authorization","Bearer "+access).contentType("application/json").content(mapper.writeValueAsString(body))).andReturn();
    }
    private void reautenticar() throws Exception {assertThat(comando(token,"/api/v1/auth/reautenticar",Map.of("senha",senha)).getResponse().getStatus()).isEqualTo(204);}
    private Map<String,Object> convite(UUID id,String email,String perfil,Set<UUID> unidades) {return Map.of("id",id,"email",email,"perfil",perfil,"unidades",unidades);}
    private MvcResult criar(Map<String,Object> body) throws Exception {return comando(token,"/api/v1/equipe/convites",body);}
    private String emitir(UUID id,String email) throws Exception {
        reautenticar();assertThat(criar(convite(id,email,"COZINHA",Set.of(unidade))).getResponse().getStatus()).isEqualTo(200);
        try(var scope=TenantScope.open(schema)){
            var e=emails.preparar();assertThat(e).isNotNull();assertThat(e.lease()).isNotNull();
            captura.entregar(e.id(),e.conteudo());emails.concluir(e.id(),e.lease(),true);
            return e.conteudo().lines().filter(l->l.startsWith("Código: ")).findFirst().orElseThrow().substring(8);
        }
    }
    private int aceitar(String codigo,String domain) throws Exception {
        return publico("convites/aceitar",domain,Map.of("codigo",codigo,"senha",senha),UUID.randomUUID().toString()).getResponse().getStatus();
    }
    private int revogar(UUID id) throws Exception {return comando(token,"/api/v1/equipe/convites/"+id+"/revogar",Map.of()).getResponse().getStatus();}
    private MvcResult consultar(String access,String rota) throws Exception {return mvc.perform(get(rota).header("Host",host).header("Authorization","Bearer "+access)).andReturn();}
    @Test void criaPorConviteVerificadoSemSessaoComVinculosExatos() throws Exception {
        UUID id=UUID.randomUUID();String email=UUID.randomUUID()+"@example.invalid",codigo=emitir(id,email);
        assertThat(contar("usuario","email=?",email)).isZero();assertThat(aceitar(codigo,"b.localhost")).isEqualTo(422);
        assertThat(aceitar(codigo,host)).isEqualTo(204);assertThat(aceitar(codigo,host)).isEqualTo(422);
        assertThat(contar("usuario","email=? and perfil='COZINHA' and ativo and email_verificado",email)).isEqualTo(1);
        assertThat(contar("sessao","usuario_id in (select id from "+schema+".usuario where email=?)",email)).isZero();
        String access=login(email,senha);
        var unidades=consultar(access,"/api/v1/operacao/unidades").getResponse();assertThat(unidades.getStatus()).isEqualTo(200);
        assertThat(mapper.readTree(unidades.getContentAsString()).size()).isEqualTo(1);assertThat(unidades.getContentAsString()).contains(unidade.toString());
        assertThat(consultar(access,"/api/v1/equipe/convites").getResponse().getStatus()).isEqualTo(403);
    }
    @Test void exigeAdministradorReautenticadoEEntradaEstrita() throws Exception {
        var body=convite(UUID.randomUUID(),UUID.randomUUID()+"@example.invalid","COZINHA",Set.of(unidade));
        assertThat(criar(body).getResponse().getStatus()).isEqualTo(403);reautenticar();
        for(String perfil:List.of("GERENTE","ATENDIMENTO","CAIXA","COZINHA","EXPEDICAO","CLIENTE")){
            UUID user=UUID.randomUUID();criarUsuario(user,perfil);String access=login(user+"@example.invalid",senha);
            assertThat(comando(access,"/api/v1/equipe/convites",body).getResponse().getStatus()).isEqualTo(403);
            assertThat(consultar(access,"/api/v1/equipe/convites").getResponse().getStatus()).isEqualTo(403);
            assertThat(comando(access,"/api/v1/equipe/convites/"+UUID.randomUUID()+"/revogar",Map.of()).getResponse().getStatus()).isEqualTo(403);
        }
        assertThat(criar(convite(UUID.randomUUID(),"novo@example.invalid","ADMINISTRADOR",Set.of(unidade))).getResponse().getStatus()).isEqualTo(400);
        assertThat(criar(convite(UUID.randomUUID(),"novo@example.invalid","CLIENTE",Set.of())).getResponse().getStatus()).isEqualTo(400);
        assertThat(criar(convite(UUID.randomUUID(),"novo@example.invalid","CAIXA",Set.of(UUID.randomUUID()))).getResponse().getStatus()).isEqualTo(404);
        var extra=new HashMap<>(body);extra.put("emailVerificado",true);assertThat(criar(extra).getResponse().getStatus()).isEqualTo(400);
    }
    @Test void intencaoIdempotenteConcorrenteEPayloadDivergente() throws Exception {
        reautenticar();UUID id=UUID.randomUUID();String email=UUID.randomUUID()+"@example.invalid";
        var body=convite(id,email,"COZINHA",Set.of(unidade));var start=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)){
            Callable<Integer> call=()->{start.await(10,TimeUnit.SECONDS);return criar(body).getResponse().getStatus();};
            var a=pool.submit(call);var b=pool.submit(call);assertThat(List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS))).containsExactly(200,200);
        }
        assertThat(contar("convite_funcionario","id=?",id)).isEqualTo(1);assertThat(contar("email_identidade","tipo=?","CONVITE")).isEqualTo(1);
        assertThat(contar("auditoria_acesso","evento='CONVITE_CRIADO' and recurso_id=?",id)).isEqualTo(1);
        assertThat(criar(convite(id,email,"CAIXA",Set.of(unidade))).getResponse().getStatus()).isEqualTo(409);
        assertThat(revogar(id)).isEqualTo(200);
        sql("update "+schema+".unidade set ativa=false where id=?",unidade);
        var retry=criar(body).getResponse();assertThat(retry.getStatus()).isEqualTo(200);assertThat(retry.getContentAsString()).contains("REVOGADO").doesNotContain("hash","codigo","senha");
        assertThat(consultar(token,"/api/v1/equipe/convites/"+id).getResponse().getStatus()).isEqualTo(200);
    }
    @Test void aceitaUmaVezSobConcorrenciaENaoConverteContaExistente() throws Exception {
        UUID id=UUID.randomUUID();String email=UUID.randomUUID()+"@example.invalid",code=emitir(id,email);var start=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)){
            Callable<Integer> call=()->{start.await(10,TimeUnit.SECONDS);return aceitar(code,host);};
            var a=pool.submit(call);var b=pool.submit(call);assertThat(List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder(204,422);
        }
        assertThat(contar("usuario","email=?",email)).isEqualTo(1);assertThat(contar("auditoria_acesso","evento='CONVITE_ACEITO' and recurso_id=?",id)).isEqualTo(1);
        assertThat(criar(convite(id,email,"COZINHA",Set.of(unidade))).getResponse().getStatus()).isEqualTo(200);
        assertThat(criar(convite(UUID.randomUUID(),email,"ADMINISTRADOR",Set.of())).getResponse().getStatus()).isEqualTo(409);
    }
    @Test void revogacaoAutorInativoUnidadeInativaEExpiracaoImpedemAceite() throws Exception {
        for(String motivo:List.of("revogado","autor","unidade","expirado")){
            UUID id=UUID.randomUUID();String email=UUID.randomUUID()+"@example.invalid",code=emitir(id,email);
            switch(motivo){
                case "revogado" -> {assertThat(revogar(id)).isEqualTo(200);assertThat(revogar(id)).isEqualTo(200);}
                case "autor" -> sql("update "+schema+".usuario set perfil='GERENTE' where id=?",admin);
                case "unidade" -> sql("update "+schema+".unidade set ativa=false where id=?",unidade);
                case "expirado" -> sql("update "+schema+".convite_funcionario set expira_em=now()-interval '1 second' where id=?",id);
                default -> throw new AssertionError();
            }
            assertThat(aceitar(code,host)).isEqualTo(422);assertThat(contar("usuario","email=?",email)).isZero();
            sql("update "+schema+".usuario set perfil='ADMINISTRADOR' where id=?",admin);sql("update "+schema+".unidade set ativa=true where id=?",unidade);
        }
    }
    @Test void csrfCamposExtrasFinalidadeEQuotaSaoVerificados() throws Exception {
        var body=Map.<String,Object>of("codigo","A".repeat(43),"senha",senha);
        assertThat(mvc.perform(post("/api/v1/auth/convites/aceitar").header("Host",host).header("Authorization","Bearer "+token).contentType("application/json").content(mapper.writeValueAsString(body))).andReturn().getResponse().getStatus()).isEqualTo(403);
        var extra=new HashMap<>(body);extra.put("perfil","ADMINISTRADOR");assertThat(publico("convites/aceitar",host,extra,"extra").getResponse().getStatus()).isEqualTo(400);
        String origem=UUID.randomUUID().toString();String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(("convite-confirmar:"+origem).getBytes(StandardCharsets.UTF_8)));
        sql("insert into "+schema+".limite_login(chave,tentativas,inicio_em) values (?,29,now())",hash);
        assertThat(publico("convites/aceitar",host,body,origem).getResponse().getStatus()).isEqualTo(422);
        assertThat(publico("convites/aceitar",host,body,origem).getResponse().getStatus()).isEqualTo(429);
        String code=emitir(UUID.randomUUID(),UUID.randomUUID()+"@example.invalid");
        for(String rota:List.of("cadastro/confirmar","recuperacao/confirmar"))assertThat(publico(rota,host,Map.of("codigo",code,"senha",senha),UUID.randomUUID().toString()).getResponse().getStatus()).isEqualTo(422);
    }
    @Test void falhaAuditoriaReverteContaVinculoEConsumo() throws Exception {
        UUID id=UUID.randomUUID();String email=UUID.randomUUID()+"@example.invalid",code=emitir(id,email);
        sql("alter table "+schema+".auditoria_acesso add constraint teste_convite check(evento<>'CONVITE_ACEITO') not valid");
        try {assertThat(aceitar(code,host)).isEqualTo(500);assertThat(contar("usuario","email=?",email)).isZero();assertThat(contar("convite_funcionario","id=? and aceito_em is null",id)).isEqualTo(1);}
        finally{sql("alter table "+schema+".auditoria_acesso drop constraint teste_convite");}
        assertThat(aceitar(code,host)).isEqualTo(204);
    }
    @Test void expiraAposEsperaPeloLockEExpurgoPreservaIntencao() throws Exception {
        UUID id=UUID.randomUUID();String email=UUID.randomUUID()+"@example.invalid",code=emitir(id,email);
        try(var pool=Executors.newSingleThreadExecutor();var c=banco()){
            c.setAutoCommit(false);try(var s=c.createStatement()){s.execute("select id from "+schema+".politica_acesso where id=1 for update");}
            var future=pool.submit(()->aceitar(code,host));boolean esperando=false;long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
            while(System.nanoTime()<deadline){
                try(var s=c.createStatement();var r=s.executeQuery("select exists(select 1 from pg_locks where not granted and transactionid in (select transactionid from pg_locks where pid=pg_backend_pid() and locktype='transactionid' and granted))")){r.next();if(r.getBoolean(1)){esperando=true;break;}}
                Thread.sleep(20);
            }
            if(!esperando){c.rollback();throw new AssertionError("Aceite não aguardou lock observado.");}
            try(var s=c.prepareStatement("update "+schema+".convite_funcionario set expira_em=clock_timestamp()-interval '25 hours' where id=?")){s.setObject(1,id);s.executeUpdate();}
            c.commit();assertThat(future.get(30,TimeUnit.SECONDS)).isEqualTo(422);
        }
        try(var scope=TenantScope.open(schema)){emails.expurgar();}
        assertThat(contar("convite_funcionario","id=? and codigo_hash is null",id)).isEqualTo(1);
        assertThat(criar(convite(id,email,"COZINHA",Set.of(unidade))).getResponse().getStatus()).isEqualTo(200);
    }
    @Test void codigosDistintosParaMesmoEmailCriamSomenteUmaConta() throws Exception {
        String email=UUID.randomUUID()+"@example.invalid";String a=emitir(UUID.randomUUID(),email),b=emitir(UUID.randomUUID(),email);
        var start=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)){
            var f1=pool.submit(()->{start.await(10,TimeUnit.SECONDS);return aceitar(a,host);});
            var f2=pool.submit(()->{start.await(10,TimeUnit.SECONDS);return aceitar(b,host);});
            assertThat(List.of(f1.get(30,TimeUnit.SECONDS),f2.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder(204,422);
        }
        assertThat(contar("usuario","email=?",email)).isEqualTo(1);
        assertThat(contar("convite_funcionario","email=? and aceito_em is not null",email)).isEqualTo(1);
        assertThat(contar("convite_funcionario","email=? and revogado_em is not null",email)).isEqualTo(1);
    }
    @Test void administradorConvidadoSemVinculosEAutorSemSessao() throws Exception {
        reautenticar();UUID id=UUID.randomUUID();String email=UUID.randomUUID()+"@example.invalid";
        assertThat(criar(convite(id,email,"ADMINISTRADOR",Set.of())).getResponse().getStatus()).isEqualTo(200);
        String code;
        try(var scope=TenantScope.open(schema)){
            var e=emails.preparar();code=e.conteudo().lines().filter(l->l.startsWith("Código: ")).findFirst().orElseThrow().substring(8);
            captura.entregar(e.id(),e.conteudo());emails.concluir(e.id(),e.lease(),true);
        }
        sql("update "+schema+".sessao set revogada_em=now() where usuario_id=?",admin);
        assertThat(aceitar(code,host)).isEqualTo(204);
        assertThat(contar("usuario","email=? and perfil='ADMINISTRADOR' and email_verificado",email)).isEqualTo(1);
        assertThat(contar("usuario_unidade","usuario_id in (select id from "+schema+".usuario where email=?)",email)).isZero();
    }
    @Test void origemBloqueadaNaoEsperaPoliticaDoAceite() throws Exception {
        String origem=UUID.randomUUID().toString();String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(("convite-confirmar:"+origem).getBytes(StandardCharsets.UTF_8)));
        sql("insert into "+schema+".limite_login(chave,tentativas,inicio_em) values (?,30,now())",hash);
        try(var pool=Executors.newSingleThreadExecutor();var c=banco()){
            c.setAutoCommit(false);try(var s=c.createStatement()){s.execute("select id from "+schema+".politica_acesso where id=1 for update");}
            var future=pool.submit(()->publico("convites/aceitar",host,Map.of("codigo","A".repeat(43),"senha",senha),origem).getResponse().getStatus());
            assertThat(future.get(3,TimeUnit.SECONDS)).isEqualTo(429);c.rollback();
        }
    }
    @Test void revogacaoConcorrenteNaoRestauraHashExpurgado() throws Exception {
        UUID id=UUID.randomUUID();emitir(id,UUID.randomUUID()+"@example.invalid");
        try(var pool=Executors.newSingleThreadExecutor();var c=banco()){
            c.setAutoCommit(false);
            try(var s=c.prepareStatement("select id from "+schema+".convite_funcionario where id=? for update")){s.setObject(1,id);s.executeQuery().close();}
            var future=pool.submit(()->revogar(id));boolean esperando=false;long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
            while(System.nanoTime()<deadline){
                try(var s=c.createStatement();var r=s.executeQuery("select exists(select 1 from pg_locks where not granted and transactionid in (select transactionid from pg_locks where pid=pg_backend_pid() and locktype='transactionid' and granted))")){r.next();if(r.getBoolean(1)){esperando=true;break;}}
                Thread.sleep(20);
            }
            if(!esperando){c.rollback();throw new AssertionError("Revogação não aguardou lock observado.");}
            try(var s=c.prepareStatement("update "+schema+".convite_funcionario set codigo_hash=null,expira_em=clock_timestamp()-interval '25 hours' where id=?")){s.setObject(1,id);s.executeUpdate();}
            c.commit();assertThat(future.get(30,TimeUnit.SECONDS)).isEqualTo(200);
        }
        assertThat(contar("convite_funcionario","id=? and codigo_hash is null and revogado_em is not null",id)).isEqualTo(1);
    }
}
