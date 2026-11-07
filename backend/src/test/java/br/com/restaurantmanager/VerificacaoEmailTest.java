package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import br.com.restaurantmanager.identidade.services.EmailIdentidadeService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.sql.DriverManager;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
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
import org.springframework.boot.webmvc.test.autoconfigure.MockMvcPrint;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc(print=MockMvcPrint.NONE)
class VerificacaoEmailTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EmailIdentidadeService emails;
    private static final Path CAPTURA=criarDiretorio();
    @DynamicPropertySource static void propriedades(DynamicPropertyRegistry registry) {
        byte[] key=new byte[32];new SecureRandom().nextBytes(key);
        String encoded=Base64.getEncoder().encodeToString(key);
        registry.add("rm.email.secret",()->encoded);
        registry.add("rm.email.capture-directory",()->CAPTURA.toString());
    }
    private static Path criarDiretorio() {
        try {return Files.createTempDirectory(Path.of(System.getenv().getOrDefault("TMPDIR",System.getProperty("java.io.tmpdir"))),"rm-verificacao-");}
        catch(IOException error){throw new IllegalStateException("Captura privada indisponível.");}
    }
    @BeforeAll static void preparar() throws Exception {TestDatabase.prepare();}
    private String email(){return UUID.randomUUID()+"@example.invalid";}
    private MvcResult enviar(String rota,String host,Map<String,Object> body,String origem) throws Exception {
        var csrf=mvc.perform(get("/api/v1/auth/csrf").header("Host",host)).andReturn().getResponse();
        var token=mapper.readTree(csrf.getContentAsString());
        return mvc.perform(post("/api/v1/auth/"+rota).header("Host",host)
                .cookie(csrf.getCookie("__Host-RM_CSRF")).header(token.get("headerName").asText(),token.get("token").asText())
                .with(r->{r.setRemoteAddr(origem);return r;}).contentType("application/json").content(mapper.writeValueAsString(body))).andReturn();
    }
    private MvcResult enviar(String rota,String host,Map<String,Object> body) throws Exception {
        return enviar(rota,host,body,"2001:db8:"+UUID.randomUUID().toString().substring(0,4)+"::1");
    }
    private void sql(String template,Object...args) throws Exception {
        try(var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"))) {
            Migrations.verifyIdentity(c,"rm_test","rm_test_owner");
            try(var s=c.prepareStatement(template.formatted(FundacaoTest.A))) {
                for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]);s.executeUpdate();
            }
        }
    }
    private long contar(String tabela,String where,Object valor) throws Exception {
        try(var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"));
                var s=c.prepareStatement("select count(*) from "+FundacaoTest.A+"."+tabela+" where "+where)) {
            s.setObject(1,valor);try(var r=s.executeQuery()){r.next();return r.getLong(1);}
        }
    }
    private UUID usuario(String email,boolean ativo,boolean verificado) throws Exception {
        UUID id=UUID.randomUUID();
        sql("insert into %s.usuario(id,email,senha_hash,perfil,ativo,email_verificado) values (?,?,'!','COZINHA',?,?)",id,email,ativo,verificado);
        sql("insert into %s.usuario_unidade(usuario_id,unidade_id) values (?,'11111111-1111-1111-1111-111111111111')",id);
        return id;
    }
    private MvcResult solicitar(String email) throws Exception {return enviar("verificacao","a.localhost",Map.of("email",email));}
    private List<String> drenar() {
        var mensagens=new ArrayList<String>();
        try(var scope=TenantScope.open(FundacaoTest.A)) {
            for(int i=0;i<100;i++) {
                var entrega=emails.preparar();if(entrega==null)return mensagens;
                if(entrega.lease()!=null){mensagens.add(entrega.conteudo());emails.concluir(entrega.id(),entrega.lease(),true);}
            }
        }
        throw new AssertionError("Fila não drenou.");
    }
    private String codigo(String email) throws Exception {
        assertThat(solicitar(email).getResponse().getStatus()).isEqualTo(202);
        return drenar().stream().filter(t->t.startsWith("Para: "+email.toLowerCase(Locale.ROOT)+"\n")&&t.contains("Assunto: Verificar e-mail"))
                .findFirst().orElseThrow().lines().filter(l->l.startsWith("Código: ")).findFirst().orElseThrow().substring(8);
    }
    private int confirmar(String code,String host) throws Exception {
        return enviar("verificacao/confirmar",host,Map.of("codigo",code)).getResponse().getStatus();
    }
    @Test void solicitacaoNeutraNaoEnumeraNemVerificaImplicitamente() throws Exception {
        String elegivel=email(),inativo=email(),verificado=email();
        usuario(elegivel,true,false);usuario(inativo,false,false);usuario(verificado,true,true);
        String resposta=solicitar(email()).getResponse().getContentAsString();
        for(String address:List.of(elegivel,inativo,verificado)) {
            var r=solicitar(address).getResponse();assertThat(r.getStatus()).isEqualTo(202);
            assertThat(r.getContentAsString()).isEqualTo(resposta);assertThat(r.getHeader("Cache-Control")).contains("no-store");
        }
        var mensagens=drenar();assertThat(mensagens.stream().filter(t->t.contains("Assunto: Verificar e-mail")).count()).isEqualTo(1);
        assertThat(contar("usuario","email=? and not email_verificado",elegivel)).isEqualTo(1);
    }
    @Test void verificaContaExistenteSemAlterarSenhaPerfilVinculosNemCriarSessao() throws Exception {
        String email=email();UUID id=usuario(email,true,false);String code=codigo(email.toUpperCase(Locale.ROOT));
        assertThat(confirmar(code,"b.localhost")).isEqualTo(422);
        assertThat(confirmar(code,"a.localhost")).isEqualTo(204);
        assertThat(contar("usuario","email=? and email_verificado and ativo and perfil='COZINHA' and senha_hash='!'",email)).isEqualTo(1);
        assertThat(contar("usuario_unidade","usuario_id=?",id)).isEqualTo(1);
        assertThat(contar("sessao","usuario_id=?",id)).isZero();
        assertThat(confirmar(code,"a.localhost")).isEqualTo(422);
        assertThat(contar("auditoria_acesso","recurso_id=? and evento='EMAIL_VERIFICADO'",id)).isEqualTo(1);
    }
    @Test void codigoExpiradoContaInativadaOuEmailAlteradoNaoVerificam() throws Exception {
        for(String caso:List.of("expirado","inativo","alterado")) {
            String email=email();UUID id=usuario(email,true,false);String code=codigo(email);
            if(caso.equals("expirado"))sql("update %s.verificacao_email set expira_em=now()-interval '1 second' where usuario_id=?",id);
            if(caso.equals("inativo"))sql("update %s.usuario set ativo=false where id=?",id);
            if(caso.equals("alterado"))sql("update %s.usuario set email=? where id=?",email(),id);
            assertThat(confirmar(code,"a.localhost")).isEqualTo(422);
            assertThat(contar("usuario","id=? and not email_verificado",id)).isEqualTo(1);
        }
    }
    @Test void codigosConcorrentesConfirmamUmaVezEAuditamUmaVez() throws Exception {
        String email=email();UUID id=usuario(email,true,false);String a=codigo(email),b=codigo(email);
        var barreira=new CyclicBarrier(2);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var f1=executor.submit(()->{barreira.await(10,TimeUnit.SECONDS);return confirmar(a,"a.localhost");});
            var f2=executor.submit(()->{barreira.await(10,TimeUnit.SECONDS);return confirmar(b,"a.localhost");});
            assertThat(List.of(f1.get(30,TimeUnit.SECONDS),f2.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder(204,422);
        }
        assertThat(contar("auditoria_acesso","recurso_id=? and evento='EMAIL_VERIFICADO'",id)).isEqualTo(1);
        assertThat(contar("verificacao_email","usuario_id=? and consumido_em is null",id)).isZero();
    }
    @Test void finalidadeSeparadaNaoRecuperaSenhaNemCriaCliente() throws Exception {
        String email=email();usuario(email,true,false);String code=codigo(email),senha=UUID.randomUUID().toString();
        for(String rota:List.of("cadastro/confirmar","recuperacao/confirmar","convites/aceitar"))
            assertThat(enviar(rota,"a.localhost",Map.of("codigo",code,"senha",senha)).getResponse().getStatus()).isEqualTo(422);
        assertThat(enviar("recuperacao","a.localhost",Map.of("email",email)).getResponse().getStatus()).isEqualTo(202);
        String recuperacao=drenar().stream().filter(t->t.contains("Assunto: Recuperar senha")).findFirst().orElseThrow().lines().filter(l->l.startsWith("Código: ")).findFirst().orElseThrow().substring(8);
        assertThat(confirmar(recuperacao,"a.localhost")).isEqualTo(422);
        assertThat(confirmar(code,"a.localhost")).isEqualTo(204);
    }
    @Test void csrfCamposExtrasELimitesPersistidosSaoObrigatorios() throws Exception {
        for(String rota:List.of("verificacao","verificacao/confirmar"))
            assertThat(mvc.perform(post("/api/v1/auth/"+rota).header("Host","a.localhost").header("Authorization","Bearer invalido").contentType("application/json").content("{}")).andReturn().getResponse().getStatus()).isEqualTo(403);
        assertThat(enviar("verificacao","a.localhost",Map.of("email",email(),"perfil","ADMINISTRADOR")).getResponse().getStatus()).isEqualTo(400);
        String email=email();for(int i=0;i<3;i++)assertThat(solicitar(email).getResponse().getStatus()).isEqualTo(202);
        assertThat(solicitar(email).getResponse().getStatus()).isEqualTo(429);
        String origem="2001:db8:"+UUID.randomUUID().toString().substring(0,4)+"::2";
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(("verificacao-confirmar:"+origem).getBytes(StandardCharsets.UTF_8)));
        sql("insert into %s.limite_login(chave,tentativas,inicio_em) values (?,29,now())",hash);
        assertThat(enviar("verificacao/confirmar","a.localhost",Map.of("codigo","A".repeat(43)),origem).getResponse().getStatus()).isEqualTo(422);
        assertThat(enviar("verificacao/confirmar","a.localhost",Map.of("codigo","A".repeat(43)),origem).getResponse().getStatus()).isEqualTo(429);
        drenar();
    }
    @Test void falhaDeAuditoriaReverteVerificacaoEConsumo() throws Exception {
        String email=email();UUID id=usuario(email,true,false);String code=codigo(email);
        sql("alter table %s.auditoria_acesso add constraint teste_verificacao_rollback check(evento<>'EMAIL_VERIFICADO') not valid");
        try {
            assertThat(confirmar(code,"a.localhost")).isEqualTo(500);
            assertThat(contar("usuario","id=? and not email_verificado",id)).isEqualTo(1);
            assertThat(contar("verificacao_email","usuario_id=? and consumido_em is null",id)).isEqualTo(1);
        } finally {sql("alter table %s.auditoria_acesso drop constraint teste_verificacao_rollback");}
        assertThat(confirmar(code,"a.localhost")).isEqualTo(204);
    }
    @Test void expiracaoRevalidadaDepoisDoLockEmpresarial() throws Exception {
        String email=email();UUID id=usuario(email,true,false);String code=codigo(email);
        try(var executor=Executors.newSingleThreadExecutor();var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"))) {
            Migrations.verifyIdentity(c,"rm_test","rm_test_owner");c.setAutoCommit(false);
            try(var s=c.createStatement()){s.execute("select id from "+FundacaoTest.A+".politica_acesso where id=1 for update");}
            var future=executor.submit(()->confirmar(code,"a.localhost"));
            long limite=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);boolean esperando=false;
            while(System.nanoTime()<limite) {
                try(var s=c.createStatement();var r=s.executeQuery("select exists(select 1 from pg_locks where not granted and transactionid in (select transactionid from pg_locks where pid=pg_backend_pid() and locktype='transactionid' and granted))")) {
                    r.next();if(r.getBoolean(1)){esperando=true;break;}
                }
                Thread.sleep(20);
            }
            if(!esperando){c.rollback();throw new AssertionError("Confirmação não aguardou lock observado.");}
            try(var s=c.prepareStatement("update "+FundacaoTest.A+".verificacao_email set expira_em=clock_timestamp() where usuario_id=?")){s.setObject(1,id);s.executeUpdate();}
            c.commit();assertThat(future.get(30,TimeUnit.SECONDS)).isEqualTo(422);
        }
        assertThat(contar("usuario","id=? and not email_verificado",id)).isEqualTo(1);
    }
    @Test void sessaoExistenteLeVerificacaoAtualSemTrocarJwt() throws Exception {
        String email=email(),senha=UUID.randomUUID().toString();UUID id=usuario(email,true,false);
        sql("update %s.usuario set senha_hash=? where id=?",new BCryptPasswordEncoder(12).encode(senha),id);
        var login=enviar("login","a.localhost",Map.of("email",email,"senha",senha)).getResponse();
        assertThat(login.getStatus()).isEqualTo(200);
        String token=mapper.readTree(login.getContentAsString()).get("accessToken").asText();
        assertThat(mapper.readTree(mvc.perform(get("/api/v1/auth/me").header("Host","a.localhost").header("Authorization","Bearer "+token)).andReturn().getResponse().getContentAsString()).get("emailVerificado").asBoolean()).isFalse();
        assertThat(confirmar(codigo(email),"a.localhost")).isEqualTo(204);
        assertThat(mapper.readTree(mvc.perform(get("/api/v1/auth/me").header("Host","a.localhost").header("Authorization","Bearer "+token)).andReturn().getResponse().getContentAsString()).get("emailVerificado").asBoolean()).isTrue();
        assertThat(contar("sessao","usuario_id=?",id)).isEqualTo(1);
    }
    @Test void retencaoRemoveApenasCodigosAntigos() throws Exception {
        String email=email();UUID id=usuario(email,true,false);codigo(email);
        sql("update %s.verificacao_email set expira_em=now()-interval '25 hours' where usuario_id=?",id);
        String recente=email();UUID outro=usuario(recente,true,false);codigo(recente);
        try(var scope=TenantScope.open(FundacaoTest.A)){emails.expurgar();}
        assertThat(contar("verificacao_email","usuario_id=?",id)).isZero();
        assertThat(contar("verificacao_email","usuario_id=?",outro)).isEqualTo(1);
    }
}
