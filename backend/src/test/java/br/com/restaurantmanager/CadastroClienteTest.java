package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import br.com.restaurantmanager.identidade.dtos.EntregaEmail;
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
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc(print=MockMvcPrint.NONE)
class CadastroClienteTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EmailIdentidadeService emails;
    @Autowired CapturaEmail captura;
    private static final Path CAPTURA=criarDiretorio();
    @DynamicPropertySource static void propriedades(DynamicPropertyRegistry registry) {
        byte[] key=new byte[32]; new SecureRandom().nextBytes(key);
        String encoded=Base64.getEncoder().encodeToString(key);
        registry.add("rm.email.secret",()->encoded);
        registry.add("rm.email.capture-directory",()->CAPTURA.toString());
    }
    private static Path criarDiretorio() {
        try { return Files.createTempDirectory(Path.of(System.getenv().getOrDefault("TMPDIR",System.getProperty("java.io.tmpdir"))),"rm-cadastro-"); }
        catch(IOException error) { throw new IllegalStateException("Não foi possível preparar captura privada."); }
    }
    @BeforeAll static void preparar() throws Exception { TestDatabase.prepare(); }
    private String email() { return UUID.randomUUID()+"@example.invalid"; }
    private RequestPostProcessor csrf() throws Exception {
        var response=mvc.perform(get("/api/v1/auth/csrf").header("Host","a.localhost")).andReturn().getResponse();
        var body=mapper.readTree(response.getContentAsString());
        return r->{r.setCookies(response.getCookie("__Host-RM_CSRF"));r.addHeader(body.get("headerName").asText(),body.get("token").asText());return r;};
    }
    private MvcResult postJson(String rota,String host,Map<String,Object> body) throws Exception {
        return postJsonOrigem(rota,host,body,"2001:db8:"+UUID.randomUUID().toString().substring(0,4)+"::1");
    }
    private MvcResult postJsonOrigem(String rota,String host,Map<String,Object> body,String origem) throws Exception {
        return mvc.perform(post("/api/v1/auth/"+rota).header("Host",host).with(csrf())
                .with(r->{r.setRemoteAddr(origem);return r;})
                .contentType("application/json").content(mapper.writeValueAsString(body))).andReturn();
    }
    private MvcResult solicitar(String email) throws Exception { return postJson("cadastro","a.localhost",Map.of("email",email)); }
    private int confirmar(String codigo,String senha,String host) throws Exception {
        return postJson("cadastro/confirmar",host,Map.of("codigo",codigo,"senha",senha)).getResponse().getStatus();
    }
    private List<EntregaEmail> drenar() throws IOException {
        var entregas=new ArrayList<EntregaEmail>();
        try(var scope=TenantScope.open(FundacaoTest.A)) {
            for(int i=0;i<100;i++) {
                var entrega=emails.preparar(); if(entrega==null)return entregas;
                if(entrega.lease()!=null) {captura.entregar(entrega.id(),entrega.conteudo());emails.concluir(entrega.id(),entrega.lease(),true);entregas.add(entrega);}
            }
        }
        throw new AssertionError("Fila de teste não drenou no limite.");
    }
    private String codigo(String email) throws Exception {
        assertThat(solicitar(email).getResponse().getStatus()).isEqualTo(202);
        for(var entrega:drenar()) if(entrega.conteudo().startsWith("Para: "+email.toLowerCase(Locale.ROOT)+"\n")) {
            String texto=Files.readString(CAPTURA.resolve(FundacaoTest.A).resolve(entrega.id()+".txt"));
            return texto.lines().filter(l->l.startsWith("Código: ")).findFirst().orElseThrow().substring(8);
        }
        throw new AssertionError("Captura do cadastro ausente.");
    }
    private void sql(String template,Object...args) throws Exception {
        try(var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"))) {
            Migrations.verifyIdentity(c,"rm_test","rm_test_owner");
            try(var s=c.prepareStatement(template.formatted(FundacaoTest.A))) {
                for(int i=0;i<args.length;i++)s.setObject(i+1,args[i]); s.executeUpdate();
            }
        }
    }
    private long contar(String tabela,String where,Object valor) throws Exception {
        try(var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"));var s=c.prepareStatement("select count(*) from "+FundacaoTest.A+"."+tabela+" where "+where)) {
            s.setObject(1,valor);try(var r=s.executeQuery()){r.next();return r.getLong(1);}
        }
    }
    @Test void solicitacaoNeutraSemSenhaSemContaAntesDaVerificacao() throws Exception {
        String email=email();var resposta=solicitar(email).getResponse();
        assertThat(resposta.getStatus()).isEqualTo(202);
        assertThat(resposta.getContentAsString()).isEqualTo("{\"mensagem\":\"Se o endereço estiver elegível, enviaremos instruções para criar a conta.\"}");
        assertThat(resposta.getHeader("Cache-Control")).contains("no-store");
        assertThat(contar("usuario","email=?",email)).isZero();
        drenar();assertThat(contar("usuario","email=?",email)).isZero();
    }
    @Test void confirmaEmailECriaSomenteClienteSemSessaoOuUnidades() throws Exception {
        String email=email(),senha=UUID.randomUUID().toString(),codigo=codigo(email.toUpperCase(Locale.ROOT));
        assertThat(confirmar(codigo,senha,"b.localhost")).isEqualTo(422);
        assertThat(confirmar(codigo,senha,"a.localhost")).isEqualTo(204);
        assertThat(contar("usuario","email=? and ativo and email_verificado and perfil='CLIENTE'",email)).isEqualTo(1);
        assertThat(contar("sessao","usuario_id in (select id from "+FundacaoTest.A+".usuario where email=?)",email)).isZero();
        assertThat(contar("usuario_unidade","usuario_id in (select id from "+FundacaoTest.A+".usuario where email=?)",email)).isZero();
        assertThat(contar("auditoria_acesso","evento='CLIENTE_CADASTRADO' and recurso_id in (select id from "+FundacaoTest.A+".usuario where email=?)",email)).isEqualTo(1);
        var login=postJson("login","a.localhost",Map.of("email",email,"senha",senha)).getResponse();
        assertThat(login.getStatus()).isEqualTo(200);
        String access=mapper.readTree(login.getContentAsString()).get("accessToken").asText();
        assertThat(mvc.perform(get("/api/v1/configuracoes/acessos").header("Host","a.localhost").header("Authorization","Bearer "+access)).andReturn().getResponse().getStatus()).isEqualTo(403);
        assertThat(postJson("login","b.localhost",Map.of("email",email,"senha",senha)).getResponse().getStatus()).isEqualTo(401);
        assertThat(confirmar(codigo,UUID.randomUUID().toString(),"a.localhost")).isEqualTo(422);
    }
    @Test void csrfMesmoComBearerCamposExtrasEDominioSaoNegados() throws Exception {
        for(String rota:List.of("cadastro","cadastro/confirmar")) {
            assertThat(mvc.perform(post("/api/v1/auth/"+rota).header("Host","a.localhost").header("Authorization","Bearer invalido").contentType("application/json").content("{}")).andReturn().getResponse().getStatus()).isEqualTo(403);
        }
        assertThat(postJson("cadastro","a.localhost",Map.of("email",email(),"perfil","ADMINISTRADOR")).getResponse().getStatus()).isEqualTo(400);
        assertThat(solicitar("invalido").getResponse().getStatus()).isEqualTo(400);
        assertThat(postJson("cadastro","desconhecido.localhost",Map.of("email",email())).getResponse().getStatus()).isEqualTo(404);
    }
    @Test void codigoInvalidoExpiradoESenhaForaDoLimiteNaoCriamConta() throws Exception {
        String email=email(),codigo=codigo(email);
        assertThat(confirmar("A".repeat(43),UUID.randomUUID().toString(),"a.localhost")).isEqualTo(422);
        assertThat(confirmar(codigo,"curta","a.localhost")).isEqualTo(400);
        assertThat(confirmar(codigo,"é".repeat(40),"a.localhost")).isEqualTo(422);
        sql("update %s.cadastro_cliente set expira_em=now()-interval '1 second' where email=?",email);
        assertThat(confirmar(codigo,UUID.randomUUID().toString(),"a.localhost")).isEqualTo(422);
        assertThat(contar("usuario","email=?",email)).isZero();
    }
    @Test void contaPreexistenteOuCriadaAposEmissaoNaoPodeSerSubstituida() throws Exception {
        String email=email(),codigo=codigo(email);UUID id=UUID.randomUUID();
        sql("insert into %s.usuario(id,email,senha_hash,perfil,ativo,email_verificado) values (?,?,'!','ADMINISTRADOR',false,false)",id,email);
        assertThat(confirmar(codigo,UUID.randomUUID().toString(),"a.localhost")).isEqualTo(422);
        String desconhecida=solicitar(email()).getResponse().getContentAsString();
        assertThat(solicitar(email).getResponse().getContentAsString()).isEqualTo(desconhecida);
        assertThat(drenar().stream().anyMatch(e->e.conteudo().startsWith("Para: "+email+"\n"))).isFalse();
        assertThat(contar("usuario","email=? and perfil='ADMINISTRADOR' and not ativo and not email_verificado and senha_hash='!'",email)).isEqualTo(1);
    }
    @Test void codigosDistintosConcorrentesCriamUmaContaEUmaAuditoria() throws Exception {
        String email=email(),a=codigo(email),b=codigo(email);var barreira=new CyclicBarrier(2);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var f1=executor.submit(()->{barreira.await(10,TimeUnit.SECONDS);return confirmar(a,UUID.randomUUID().toString(),"a.localhost");});
            var f2=executor.submit(()->{barreira.await(10,TimeUnit.SECONDS);return confirmar(b,UUID.randomUUID().toString(),"a.localhost");});
            assertThat(List.of(f1.get(30,TimeUnit.SECONDS),f2.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder(204,422);
        }
        assertThat(contar("usuario","email=?",email)).isEqualTo(1);
        assertThat(contar("cadastro_cliente","email=? and consumido_em is null",email)).isZero();
        assertThat(contar("auditoria_acesso","evento='CLIENTE_CADASTRADO' and recurso_id in (select id from "+FundacaoTest.A+".usuario where email=?)",email)).isEqualTo(1);
    }
    @Test void finalidadeDoCodigoNaoPermiteRecuperacaoNemCadastroComTokenDeRecuperacao() throws Exception {
        String email=email(),code=codigo(email),senha=UUID.randomUUID().toString();
        assertThat(postJson("recuperacao/confirmar","a.localhost",Map.of("codigo",code,"senha",senha)).getResponse().getStatus()).isEqualTo(422);
        assertThat(confirmar(code,senha,"a.localhost")).isEqualTo(204);
        assertThat(postJson("recuperacao","a.localhost",Map.of("email",email)).getResponse().getStatus()).isEqualTo(202);
        String recuperacao=drenar().stream().filter(e->e.conteudo().contains("Assunto: Recuperar senha")).findFirst().orElseThrow().conteudo().lines().filter(l->l.startsWith("Código: ")).findFirst().orElseThrow().substring(8);
        assertThat(confirmar(recuperacao,UUID.randomUUID().toString(),"a.localhost")).isEqualTo(422);
    }
    @Test void solicitacaoTemLimitePersistidoESeparadoDaRecuperacao() throws Exception {
        String email=email();
        for(int i=0;i<3;i++)assertThat(solicitar(email).getResponse().getStatus()).isEqualTo(202);
        assertThat(solicitar(email).getResponse().getStatus()).isEqualTo(429);
        assertThat(postJson("recuperacao","a.localhost",Map.of("email",email)).getResponse().getStatus()).isEqualTo(202);
        drenar();
    }
    @Test void falhaNaAuditoriaReverteUsuarioEConsumoDoCodigo() throws Exception {
        String email=email(),code=codigo(email),senha=UUID.randomUUID().toString();
        sql("alter table %s.auditoria_acesso add constraint teste_cadastro_rollback check (evento<>'CLIENTE_CADASTRADO') not valid");
        try {
            assertThat(confirmar(code,senha,"a.localhost")).isEqualTo(500);
            assertThat(contar("usuario","email=?",email)).isZero();
            assertThat(contar("cadastro_cliente","email=? and consumido_em is null",email)).isEqualTo(1);
        } finally {sql("alter table %s.auditoria_acesso drop constraint teste_cadastro_rollback");}
        assertThat(confirmar(code,senha,"a.localhost")).isEqualTo(204);
    }
    @Test void expiracaoEhRevalidadaAposEsperaPelaPolitica() throws Exception {
        String email=email(),code=codigo(email);
        try(var executor=Executors.newSingleThreadExecutor();var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"))) {
            Migrations.verifyIdentity(c,"rm_test","rm_test_owner");c.setAutoCommit(false);
            try(var s=c.createStatement()){s.execute("select id from "+FundacaoTest.A+".politica_acesso where id=1 for update");}
            var future=executor.submit(()->confirmar(code,UUID.randomUUID().toString(),"a.localhost"));
            long limite=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);boolean esperando=false;
            while(System.nanoTime()<limite) {
                try(var s=c.createStatement();var r=s.executeQuery("select exists(select 1 from pg_locks where not granted and transactionid in (select transactionid from pg_locks where pid=pg_backend_pid() and locktype='transactionid' and granted))")) {
                    r.next();if(r.getBoolean(1)){esperando=true;break;}
                }
                Thread.sleep(20);
            }
            if(!esperando){c.rollback();throw new AssertionError("A confirmação não aguardou o lock observado.");}
            try(var s=c.prepareStatement("update "+FundacaoTest.A+".cadastro_cliente set expira_em=clock_timestamp() where email=?")){s.setString(1,email);s.executeUpdate();}
            c.commit();assertThat(future.get(30,TimeUnit.SECONDS)).isEqualTo(422);
        }
        assertThat(contar("usuario","email=?",email)).isZero();
    }
    @Test void origemBloqueadaNaoEsperaPoliticaEmpresarial() throws Exception {
        for(String rota:List.of("cadastro","recuperacao")) origemBloqueada(rota);
    }
    private void origemBloqueada(String rota) throws Exception {
        String origem="2001:db8:"+UUID.randomUUID().toString().substring(0,4)+"::2";
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest((rota+"-confirmar:"+origem).getBytes(StandardCharsets.UTF_8)));
        sql("insert into %s.limite_login(chave,tentativas,inicio_em) values (?,30,now())",hash);
        try(var executor=Executors.newSingleThreadExecutor();var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"))) {
            Migrations.verifyIdentity(c,"rm_test","rm_test_owner");c.setAutoCommit(false);
            try(var s=c.createStatement()){s.execute("select id from "+FundacaoTest.A+".politica_acesso where id=1 for update");}
            var future=executor.submit(()->postJsonOrigem(rota+"/confirmar","a.localhost",Map.of("codigo","A".repeat(43),"senha",UUID.randomUUID().toString()),origem).getResponse().getStatus());
            assertThat(future.get(3,TimeUnit.SECONDS)).isEqualTo(429);
            c.rollback();
        }
    }
    @Test void confirmacoesInvalidasConsomemQuotaAteOBloqueio() throws Exception {
        String origem="2001:db8:"+UUID.randomUUID().toString().substring(0,4)+"::4";
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(("cadastro-confirmar:"+origem).getBytes(StandardCharsets.UTF_8)));
        sql("insert into %s.limite_login(chave,tentativas,inicio_em) values (?,29,now())",hash);
        var body=Map.<String,Object>of("codigo","A".repeat(43),"senha",UUID.randomUUID().toString());
        assertThat(postJsonOrigem("cadastro/confirmar","a.localhost",body,origem).getResponse().getStatus()).isEqualTo(422);
        assertThat(postJsonOrigem("cadastro/confirmar","a.localhost",body,origem).getResponse().getStatus()).isEqualTo(429);
    }
    @Test void limitePorOrigemNaoConsomeQuotaDeOutroEndereco() throws Exception {
        String origem="2001:db8:"+UUID.randomUUID().toString().substring(0,4)+"::3",email=email();
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(("cadastro-origem:"+origem).getBytes(StandardCharsets.UTF_8)));
        sql("insert into %s.limite_login(chave,tentativas,inicio_em) values (?,29,now())",hash);
        assertThat(postJsonOrigem("cadastro","a.localhost",Map.of("email",email()),origem).getResponse().getStatus()).isEqualTo(202);
        assertThat(postJsonOrigem("cadastro","a.localhost",Map.of("email",email),origem).getResponse().getStatus()).isEqualTo(429);
        for(int i=0;i<3;i++)assertThat(solicitar(email).getResponse().getStatus()).isEqualTo(202);
        assertThat(solicitar(email).getResponse().getStatus()).isEqualTo(429);drenar();
    }
    @Test void retencaoRemoveCodigoAntigoPreservaRecente() throws Exception {
        String antigo=email(),recente=email();codigo(antigo);codigo(recente);
        sql("update %s.cadastro_cliente set expira_em=now()-interval '25 hours' where email=?",antigo);
        try(var scope=TenantScope.open(FundacaoTest.A)){emails.expurgar();}
        assertThat(contar("cadastro_cliente","email=?",antigo)).isZero();
        assertThat(contar("cadastro_cliente","email=?",recente)).isEqualTo(1);
    }
}
