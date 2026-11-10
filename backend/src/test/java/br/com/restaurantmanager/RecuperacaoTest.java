package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import br.com.restaurantmanager.identidade.infrastructure.CapturaEmail;
import br.com.restaurantmanager.identidade.services.EmailIdentidadeService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.nio.file.attribute.PosixFilePermissions;
import java.security.SecureRandom;
import java.sql.DriverManager;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
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
class RecuperacaoTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired EmailIdentidadeService emails;
    @Autowired CapturaEmail captura;
    private UUID usuario;
    private String email;
    private String senha;
    private final List<UUID> mensagens=new ArrayList<>();
    private static final Path CAPTURA=criarDiretorio();
    @DynamicPropertySource static void propriedades(DynamicPropertyRegistry registry) {
        byte[] key=new byte[32]; new SecureRandom().nextBytes(key);
        String encoded=Base64.getEncoder().encodeToString(key);
        registry.add("rm.email.secret",()->encoded);
        registry.add("rm.email.capture-directory",()->CAPTURA.toString());
    }
    private static Path criarDiretorio() {
        try { return Files.createTempDirectory(Path.of(System.getenv().getOrDefault("TMPDIR",System.getProperty("java.io.tmpdir"))),"rm-recuperacao-"); }
        catch(IOException error) { throw new IllegalStateException("Não foi possível preparar captura privada."); }
    }
    @BeforeAll static void preparar() throws Exception { TestDatabase.prepare(); }
    @BeforeEach void conta() throws Exception {
        usuario=UUID.randomUUID(); email=usuario+"@example.invalid"; senha=UUID.randomUUID().toString();
        String hash=new BCryptPasswordEncoder(12).encode(senha);
        for(String schema:List.of(FundacaoTest.A,FundacaoTest.B)) {
            sql(schema,"insert into %s.usuario(id,email,senha_hash,perfil,email_verificado) values (?,?,?,'CLIENTE',true)",usuario,email,hash);
        }
    }
    @AfterEach void limpar() throws Exception {
        for(String schema:List.of(FundacaoTest.A,FundacaoTest.B)) {
            for(UUID id:mensagens) sql(schema,"delete from %s.email_identidade where id=?",id);
            sql(schema,"delete from %s.recuperacao_senha where usuario_id=?",usuario);
            sql(schema,"delete from %s.refresh_token where sessao_id in (select id from "+schema+".sessao where usuario_id=?)",usuario);
            sql(schema,"delete from %s.sessao where usuario_id=?",usuario);
            sql(schema,"delete from %s.usuario where id=?",usuario);
        }
    }
    private void sql(String schema,String template,Object...args) throws Exception {
        try(var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"))) {
            Migrations.verifyIdentity(c,"rm_test","rm_test_owner");
            try(var s=c.prepareStatement(template.formatted(schema))) {
                for(int i=0;i<args.length;i++) s.setObject(i+1,args[i]); s.executeUpdate();
            }
        }
    }
    private List<UUID> ids() throws Exception {
        try(var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"));var s=c.createStatement();var r=s.executeQuery("select id from "+FundacaoTest.A+".email_identidade")) {
            var ids=new ArrayList<UUID>(); while(r.next()) ids.add(r.getObject(1,UUID.class)); return ids;
        }
    }
    private long emailsExpiradosAntesDe(Instant limite) throws Exception {
        try (var c = DriverManager.getConnection(System.getenv("RM_DB_URL"),
                System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"))) {
            Migrations.verifyIdentity(c, "rm_test", "rm_test_owner");
            try (var s = c.prepareStatement("select count(*) from " + FundacaoTest.A
                    + ".email_identidade where expira_em < ?")) {
                s.setTimestamp(1, Timestamp.from(limite));
                try (var r = s.executeQuery()) {
                    r.next();
                    return r.getLong(1);
                }
            }
        }
    }
    private RequestPostProcessor csrf() throws Exception {
        var response=mvc.perform(get("/api/v1/auth/csrf").header("Host","a.localhost")).andReturn().getResponse();
        var body=mapper.readTree(response.getContentAsString());
        return r->{r.setCookies(response.getCookie("__Host-RM_CSRF"));r.addHeader(body.get("headerName").asText(),body.get("token").asText());return r;};
    }

    private MvcResult solicitar(String email, String host, boolean csrf) throws Exception {
        var request = post("/api/v1/auth/recuperacao").header("Host", host)
                .with(r -> { r.setRemoteAddr("2001:db8:" + UUID.randomUUID().toString().substring(0,4) + "::1"); return r; })
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("email", email)));
        if (csrf) {
            var response = mvc.perform(get("/api/v1/auth/csrf").header("Host", "a.localhost")).andReturn().getResponse();
            var body = mapper.readTree(response.getContentAsString());
            request.cookie(response.getCookie("__Host-RM_CSRF")).header(body.get("headerName").asText(), body.get("token").asText());
        }
        var antes=ids();
        var result=mvc.perform(request).andReturn();
        for(UUID id:ids()) if(!antes.contains(id)) mensagens.add(id);
        return result;
    }
    @Test void contaDesconhecidaRecebeRespostaNeutraSemSegredo() throws Exception {
        var response = solicitar(UUID.randomUUID() + "@example.invalid", "a.localhost", true).getResponse();
        assertThat(response.getStatus()).isEqualTo(202);
        assertThat(response.getContentAsString()).isEqualTo("{\"mensagem\":\"Se a conta estiver elegível, enviaremos instruções de recuperação.\"}");
        assertThat(response.getHeader("Cache-Control")).contains("no-store");
    }
    @Test void csrfDominioEValidacaoContinuamObrigatorios() throws Exception {
        assertThat(solicitar("teste@example.invalid", "a.localhost", false).getResponse().getStatus()).isEqualTo(403);
        assertThat(solicitar("teste@example.invalid", "desconhecido.localhost", true).getResponse().getStatus()).isEqualTo(404);
        assertThat(solicitar("invalido", "a.localhost", true).getResponse().getStatus()).isEqualTo(400);
    }
    private String codigo() throws Exception {
        assertThat(solicitar(email,"a.localhost",true).getResponse().getStatus()).isEqualTo(202);
        try(var scope=TenantScope.open(FundacaoTest.A)) {
            var entrega=emails.preparar();
            assertThat(entrega).isNotNull(); assertThat(entrega.lease()).isNotNull();
            captura.entregar(entrega.id(),entrega.conteudo());
            emails.concluir(entrega.id(),entrega.lease(),true);
            String conteudo=Files.readString(CAPTURA.resolve(FundacaoTest.A).resolve(entrega.id()+".txt"));
            return conteudo.lines().filter(l->l.startsWith("Código: ")).findFirst().orElseThrow().substring(8);
        }
    }
    private MvcResult confirmar(String code,String password,String host) throws Exception {
        var antes=ids();
        var result=mvc.perform(post("/api/v1/auth/recuperacao/confirmar").header("Host",host).with(csrf())
                .with(r->{r.setRemoteAddr("2001:db8:"+UUID.randomUUID().toString().substring(0,4)+"::1");return r;})
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("codigo",code,"senha",password)))).andReturn();
        synchronized(mensagens) {for(UUID id:ids()) if(!antes.contains(id)&&!mensagens.contains(id)) mensagens.add(id);}
        return result;
    }
    private MvcResult login(String password,String host) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").header("Host",host).with(csrf())
                .with(r->{r.setRemoteAddr("2001:db8:"+UUID.randomUUID().toString().substring(0,4)+"::1");return r;})
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("email",email,"senha",password)))).andReturn();
    }
    @Test void recuperaRevogaAccessRefreshEOutrosCodigosSemAfetarOutroTenant() throws Exception {
        var login=login(senha,"a.localhost").getResponse(); assertThat(login.getStatus()).isEqualTo(200);
        String access=mapper.readTree(login.getContentAsString()).get("accessToken").asText();
        String antigo=codigo(); String code=codigo(); String nova=UUID.randomUUID().toString();
        assertThat(confirmar(code,nova,"b.localhost").getResponse().getStatus()).isEqualTo(422);
        assertThat(confirmar(code,nova,"a.localhost").getResponse().getStatus()).isEqualTo(204);
        assertThat(mvc.perform(get("/api/v1/auth/me").header("Host","a.localhost").header("Authorization","Bearer "+access)).andReturn().getResponse().getStatus()).isEqualTo(401);
        var csrf=csrf();
        assertThat(mvc.perform(post("/api/v1/auth/refresh").header("Host","a.localhost").with(csrf)
                .cookie(login.getCookie("RM_REFRESH"))).andReturn().getResponse().getStatus()).isEqualTo(401);
        assertThat(confirmar(antigo,nova,"a.localhost").getResponse().getStatus()).isEqualTo(422);
        assertThat(confirmar(code,nova,"a.localhost").getResponse().getStatus()).isEqualTo(422);
        assertThat(login(senha,"a.localhost").getResponse().getStatus()).isEqualTo(401);
        assertThat(login(nova,"a.localhost").getResponse().getStatus()).isEqualTo(200);
        assertThat(login(senha,"b.localhost").getResponse().getStatus()).isEqualTo(200);
        try(var scope=TenantScope.open(FundacaoTest.A)) {
            var aviso=emails.preparar(); assertThat(aviso.conteudo()).contains("Senha alterada").doesNotContain(nova,code,antigo);
            captura.entregar(aviso.id(),aviso.conteudo()); emails.concluir(aviso.id(),aviso.lease(),true);
        }
    }
    @Test void expiradoInativoEEntradaAdulteradaNaoAlteramSenha() throws Exception {
        String code=codigo();
        sql(FundacaoTest.A,"update %s.recuperacao_senha set expira_em=now()-interval '1 second' where usuario_id=?",usuario);
        assertThat(confirmar(code,UUID.randomUUID().toString(),"a.localhost").getResponse().getStatus()).isEqualTo(422);
        code=codigo();
        assertThat(confirmar(code,"é".repeat(40),"a.localhost").getResponse().getStatus()).isEqualTo(422);
        assertThat(confirmar(code,"curta","a.localhost").getResponse().getStatus()).isEqualTo(400);
        sql(FundacaoTest.A,"update %s.usuario set ativo=false where id=?",usuario);
        assertThat(confirmar(code,UUID.randomUUID().toString(),"a.localhost").getResponse().getStatus()).isEqualTo(422);
        sql(FundacaoTest.A,"update %s.usuario set ativo=true where id=?",usuario);
        assertThat(login(senha,"a.localhost").getResponse().getStatus()).isEqualTo(200);
    }
    @Test void consumoConcorrenteTemSomenteUmVencedor() throws Exception {
        String code=codigo(); var barreira=new CyclicBarrier(2);
        try(var executor=Executors.newFixedThreadPool(2)) {
            Callable<Integer> task=()->{barreira.await(10,TimeUnit.SECONDS);return confirmar(code,UUID.randomUUID().toString(),"a.localhost").getResponse().getStatus();};
            var a=executor.submit(task);var b=executor.submit(task);
            assertThat(List.of(a.get(30,TimeUnit.SECONDS),b.get(30,TimeUnit.SECONDS))).containsExactlyInAnyOrder(204,422);
        }
    }
    @Test void contaInexistenteEInativaSaoIgnoradasSomenteNoWorker() throws Exception {
        String unknown=UUID.randomUUID()+"@example.invalid";
        String normal=solicitar(email,"a.localhost",true).getResponse().getContentAsString();
        assertThat(solicitar(unknown,"a.localhost",true).getResponse().getContentAsString()).isEqualTo(normal);
        sql(FundacaoTest.A,"update %s.usuario set ativo=false where id=?",usuario);
        try(var scope=TenantScope.open(FundacaoTest.A)) {
            assertThat(emails.preparar().lease()).isNull(); assertThat(emails.preparar().lease()).isNull(); assertThat(emails.preparar()).isNull();
        }
    }
    @Test void limitePersistidoNaoDependeDeContaExistente() throws Exception {
        String unknown=UUID.randomUUID()+"@example.invalid";
        for(int i=0;i<3;i++) assertThat(solicitar(unknown,"a.localhost",true).getResponse().getStatus()).isEqualTo(202);
        assertThat(solicitar(unknown,"a.localhost",true).getResponse().getStatus()).isEqualTo(429);
    }
    @Test void capturaIdempotenteRetomaLeaseSemCriarOutroToken() throws Exception {
        assertThat(solicitar(email,"a.localhost",true).getResponse().getStatus()).isEqualTo(202);
        try(var scope=TenantScope.open(FundacaoTest.A)) {
            var primeira=emails.preparar(); captura.entregar(primeira.id(),primeira.conteudo());
            assertThat(emails.preparar()).isNull();
            sql(FundacaoTest.A,"update %s.email_identidade set proxima_em=now()-interval '1 second' where id=?",primeira.id());
            var retomada=emails.preparar(); assertThat(retomada.id()).isEqualTo(primeira.id()); assertThat(retomada.lease()).isNotEqualTo(primeira.lease());
            assertThat(retomada.conteudo()).isEqualTo(primeira.conteudo());
            emails.concluir(primeira.id(),primeira.lease(),true);
            captura.entregar(retomada.id(),retomada.conteudo()); emails.concluir(retomada.id(),retomada.lease(),true);
            assertThat(emails.preparar()).isNull();
            assertThat(Files.getPosixFilePermissions(CAPTURA.resolve(FundacaoTest.A).resolve(primeira.id()+".txt"))).isEqualTo(PosixFilePermissions.fromString("rw-------"));
        }
    }
    @Test void falhaTemRetryLimitadoEExpiracaoNaoEntregaCodigoAntigo() throws Exception {
        assertThat(solicitar(email,"a.localhost",true).getResponse().getStatus()).isEqualTo(202);
        try(var scope=TenantScope.open(FundacaoTest.A)) {
            UUID id=mensagens.getLast();
            for(int i=0;i<5;i++) {
                var entrega=emails.preparar(); emails.concluir(entrega.id(),entrega.lease(),false);
                sql(FundacaoTest.A,"update %s.email_identidade set proxima_em=now()-interval '1 second' where id=?",id);
            }
            assertThat(emails.preparar()).isNull();
            try(var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"));var s=c.prepareStatement("select conteudo_cifrado from "+FundacaoTest.A+".email_identidade where id=?")) {
                s.setObject(1,id);try(var r=s.executeQuery()){r.next();assertThat(r.getString(1)).isNull();}
            }
        }
        assertThat(solicitar(email,"a.localhost",true).getResponse().getStatus()).isEqualTo(202);
        sql(FundacaoTest.A,"update %s.email_identidade set expira_em=now()-interval '1 second' where id=?",mensagens.getLast());
        try(var scope=TenantScope.open(FundacaoTest.A)) {
            assertThat(emails.preparar().lease()).isNull();
        }
    }
    @Test void conteudoCorrompidoNaoBloqueiaMensagemSeguinte() throws Exception {
        assertThat(solicitar(email,"a.localhost",true).getResponse().getStatus()).isEqualTo(202);
        sql(FundacaoTest.A,"update %s.email_identidade set conteudo_cifrado='invalido' where id=?",mensagens.getLast());
        assertThat(solicitar(email,"a.localhost",true).getResponse().getStatus()).isEqualTo(202);
        try(var scope=TenantScope.open(FundacaoTest.A)) {
            assertThat(emails.preparar().lease()).isNull();
            assertThat(emails.preparar().lease()).isNotNull();
        }
    }
    @Test void retencaoRemoveSomenteExpiradosAntigosECapturasDoTenant() throws Exception {
        String code=codigo();
        assertThat(solicitar(email,"a.localhost",true).getResponse().getStatus()).isEqualTo(202);
        UUID antigo=mensagens.getFirst();UUID recente=mensagens.getLast();
        sql(FundacaoTest.A,"update %s.recuperacao_senha set expira_em=now()-interval '25 hours' where usuario_id=?",usuario);
        sql(FundacaoTest.A,"update %s.email_identidade set expira_em=now()-interval '25 hours' where id=?",antigo);
        Path arquivo=CAPTURA.resolve(FundacaoTest.A).resolve(antigo+".txt");
        Files.setLastModifiedTime(arquivo,FileTime.from(Instant.now().minusSeconds(90000)));
        // O tenant compartilhado pode ter mais de um lote de mensagens de execuções anteriores.
        // O corte fixo e a queda da contagem comprovam progresso, sem retries ilimitados.
        Instant limite = Instant.now().minusSeconds(86400);
        long restantes = emailsExpiradosAntesDe(limite);
        long maximoLotes = restantes;
        assertThat(restantes).isPositive();
        assertThat(ids()).contains(antigo, recente);
        try (var scope = TenantScope.open(FundacaoTest.A)) {
            for (long lote = 0; lote < maximoLotes && ids().contains(antigo); lote++) {
                emails.expurgar();
                long depois = emailsExpiradosAntesDe(limite);
                assertThat(depois).as("O lote %s precisa remover mensagens antigas", lote + 1)
                        .isLessThan(restantes);
                restantes = depois;
            }
            captura.expurgar();
        }
        assertThat(ids()).contains(recente).doesNotContain(antigo);assertThat(Files.exists(arquivo)).isFalse();
        assertThat(confirmar(code,UUID.randomUUID().toString(),"a.localhost").getResponse().getStatus()).isEqualTo(422);
    }
    @Test void codigoExpiradoDuranteEsperaPorLockNaoPodeSerConsumido() throws Exception {
        String code=codigo();
        try(var executor=Executors.newSingleThreadExecutor();var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"))) {
            Migrations.verifyIdentity(c,"rm_test","rm_test_owner");c.setAutoCommit(false);
            try(var s=c.createStatement()) {s.execute("select id from "+FundacaoTest.A+".politica_acesso where id=1 for update");}
            var future=executor.submit(()->confirmar(code,UUID.randomUUID().toString(),"a.localhost").getResponse().getStatus());
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(10);
            boolean aguardando=false;
            while(System.nanoTime()<deadline) {
                try(var s=c.createStatement();var r=s.executeQuery("select exists(select 1 from pg_locks where not granted and transactionid in (select transactionid from pg_locks where pid=pg_backend_pid() and locktype='transactionid' and granted))")) {
                    r.next();if(r.getBoolean(1)){aguardando=true;break;}
                }
                Thread.sleep(20);
            }
            // Soltar o lock também se a observação falhar; executor não pode fechar bloqueado.
            if(!aguardando) { c.rollback(); throw new AssertionError("A requisição não aguardou o lock observado."); }
            try(var s=c.prepareStatement("update "+FundacaoTest.A+".recuperacao_senha set expira_em=clock_timestamp() where usuario_id=?")){s.setObject(1,usuario);s.executeUpdate();}
            c.commit();
            assertThat(future.get(30,TimeUnit.SECONDS)).isEqualTo(422);
        }
        assertThat(login(senha,"a.localhost").getResponse().getStatus()).isEqualTo(200);
    }
}
