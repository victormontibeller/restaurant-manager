package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import br.com.restaurantmanager.plataforma.services.PlataformaService;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.tenancy.infrastructure.Migrations;
import com.nimbusds.jwt.SignedJWT;
import jakarta.servlet.http.Cookie;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
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
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class PlataformaTest {
    private static final String AUTH = "/api/v1/plataforma/auth/";
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired JwtEncoder encoder;
    @Autowired PlataformaService service;
    private UUID usuario;
    private String email;
    private String senha;
    private String origem;

    @BeforeAll static void preparar() throws Exception { TestDatabase.prepare(); }
    @BeforeEach void conta() throws Exception {
        usuario=UUID.randomUUID(); email=usuario+"@example.invalid"; senha=UUID.randomUUID().toString();
        origem="2001:db8:"+usuario.toString().substring(0,4)+":"+usuario.toString().substring(4,8)+"::1";
        try(var c=conexao();var s=c.prepareStatement("insert into public.usuario_plataforma(id,email,senha_hash) values (?,?,?)")) {
            s.setObject(1,usuario);s.setString(2,email);s.setString(3,new BCryptPasswordEncoder(12).encode(senha));s.executeUpdate();
        }
    }
    private Connection conexao() throws Exception {
        var c=DriverManager.getConnection(System.getenv("RM_DB_URL"),System.getenv("RM_MIGRATION_USER"),System.getenv("RM_MIGRATION_PASSWORD"));
        Migrations.verifyIdentity(c,"rm_test","rm_test_owner");return c;
    }
    private long sessoesDaConta() throws Exception {
        try (var c = conexao(); var s = c.prepareStatement(
                "select count(*) from public.sessao_plataforma where usuario_id=?")) {
            s.setObject(1, usuario);
            try (var r = s.executeQuery()) {
                r.next();
                return r.getLong(1);
            }
        }
    }
    private long sessoesExpiradasAntesDe(Instant limite) throws Exception {
        try (var c = conexao(); var s = c.prepareStatement(
                "select count(*) from public.sessao_plataforma where expira_em < ?")) {
            s.setTimestamp(1, Timestamp.from(limite));
            try (var r = s.executeQuery()) {
                r.next();
                return r.getLong(1);
            }
        }
    }
    private RequestPostProcessor csrf() throws Exception {
        var r=mvc.perform(get(AUTH+"csrf").header("Host","plataforma.localhost")).andExpect(status().isOk()).andReturn().getResponse();
        var b=mapper.readTree(r.getContentAsString());var cookie=r.getCookie("__Host-RM_PLATFORM_CSRF");
        assertThat(cookie).isNotNull();assertThat(cookie.getSecure()).isTrue();assertThat(cookie.isHttpOnly()).isTrue();assertThat(cookie.getDomain()).isNull();
        return request->{var cookies=new ArrayList<Cookie>();if(request.getCookies()!=null)cookies.addAll(List.of(request.getCookies()));cookies.add(cookie);request.setCookies(cookies.toArray(Cookie[]::new));request.addHeader(b.get("headerName").asText(),b.get("token").asText());return request;};
    }
    private MvcResult login(String password) throws Exception {
        return mvc.perform(post(AUTH+"login").header("Host","plataforma.localhost").with(csrf()).with(r->{r.setRemoteAddr(origem);return r;})
                .contentType("application/json").content(mapper.writeValueAsString(Map.of("email",email,"senha",password)))).andReturn();
    }
    private String token(MvcResult r) throws Exception {
        assertThat(r.getResponse().getStatus()).isEqualTo(200);return mapper.readTree(r.getResponse().getContentAsString()).get("accessToken").asText();
    }
    @Test void loginConsultaSomenteMetadadosERejeitaContextoEmpresarial() throws Exception {
        var r=login(senha);String access=token(r);
        var cookie=r.getResponse().getCookie("RM_PLATFORM_REFRESH");
        assertThat(cookie.getPath()).isEqualTo("/api/v1/plataforma/auth");assertThat(cookie.getSecure()).isTrue();assertThat(cookie.isHttpOnly()).isTrue();assertThat(cookie.getAttribute("SameSite")).isEqualTo("Strict");
        assertThat(r.getResponse().getHeader("Cache-Control")).contains("no-store");
        mvc.perform(get(AUTH+"me").header("Host","plataforma.localhost").header("Authorization","Bearer "+access)).andExpect(status().isOk());
        var empresas=mvc.perform(get("/api/v1/plataforma/empresas").header("Host","plataforma.localhost").header("Authorization","Bearer "+access)).andExpect(status().isOk()).andReturn();
        assertThat(empresas.getResponse().getContentAsString()).doesNotContain("senha","schema_name","administrador_email","usuario","recebimento");
        mvc.perform(get("/api/v1/auth/me").header("Host","a.localhost").header("Authorization","Bearer "+access)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/equipe").header("Host","a.localhost").header("Authorization","Bearer "+access)).andExpect(status().isUnauthorized());
        mvc.perform(get(AUTH+"me").header("Host","a.localhost").header("Authorization","Bearer "+access)).andExpect(status().isNotFound());
        mvc.perform(get(AUTH+"me").header("Host","invasor.localhost").header("Forwarded","host=plataforma.localhost").header("Authorization","Bearer "+access)).andExpect(status().isNotFound());
        assertThat(TenantScope.current()).isEqualTo("__none__");
    }
    @Test void csrfObrigatorioMesmoComBearerECookieEmpresarialNaoServe() throws Exception {
        var r=login(senha);String access=token(r);
        for(String action:List.of("login","refresh","logout"))mvc.perform(post(AUTH+action).header("Host","plataforma.localhost").header("Authorization","Bearer "+access)
                .cookie(r.getResponse().getCookie("RM_PLATFORM_REFRESH")).contentType("application/json").content("{}")).andExpect(status().isForbidden());
        mvc.perform(post(AUTH+"refresh").header("Host","plataforma.localhost").with(csrf()).cookie(new Cookie("RM_REFRESH",r.getResponse().getCookie("RM_PLATFORM_REFRESH").getValue()))).andExpect(status().isUnauthorized());
    }
    @Test void refreshRotativoReusoRevogaFamiliaELogoutRevogaAccess() throws Exception {
        var first=login(senha);String access=token(first);var old=first.getResponse().getCookie("RM_PLATFORM_REFRESH");
        var second=mvc.perform(post(AUTH+"refresh").header("Host","plataforma.localhost").cookie(old).with(csrf())).andExpect(status().isOk()).andReturn();
        String renewed=token(second);assertThat(second.getResponse().getCookie("RM_PLATFORM_REFRESH").getValue()).isNotEqualTo(old.getValue());
        mvc.perform(post(AUTH+"refresh").header("Host","plataforma.localhost").cookie(old).with(csrf())).andExpect(status().isUnauthorized());
        for(String jwt:List.of(access,renewed))mvc.perform(get(AUTH+"me").header("Host","plataforma.localhost").header("Authorization","Bearer "+jwt)).andExpect(status().isUnauthorized());
        var third=login(senha);String thirdAccess=token(third);
        mvc.perform(post(AUTH+"logout").header("Host","plataforma.localhost").cookie(third.getResponse().getCookie("RM_PLATFORM_REFRESH")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get(AUTH+"me").header("Host","plataforma.localhost").header("Authorization","Bearer "+thirdAccess)).andExpect(status().isUnauthorized());
    }
    @Test void refreshSimultaneoTemUmVencedorERevogaFamilia() throws Exception {
        var r=login(senha);String access=token(r);var cookie=r.getResponse().getCookie("RM_PLATFORM_REFRESH");
        var start=new CyclicBarrier(2);
        try(var executor=Executors.newFixedThreadPool(2)) {
            Callable<Integer> task=()->{var csrf=csrf();start.await(10,TimeUnit.SECONDS);return mvc.perform(post(AUTH+"refresh").header("Host","plataforma.localhost").cookie(cookie).with(csrf)).andReturn().getResponse().getStatus();};
            var a=executor.submit(task);var b=executor.submit(task);
            assertThat(List.of(a.get(20,TimeUnit.SECONDS),b.get(20,TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,401);
        }
        mvc.perform(get(AUTH+"me").header("Host","plataforma.localhost").header("Authorization","Bearer "+access)).andExpect(status().isUnauthorized());
    }
    @Test void inativacaoELimitePersistidoValemImediatamente() throws Exception {
        var r=login(senha);String access=token(r);
        try(var c=conexao();var s=c.prepareStatement("update public.usuario_plataforma set ativo=false where id=?")){s.setObject(1,usuario);s.executeUpdate();}
        mvc.perform(get(AUTH+"me").header("Host","plataforma.localhost").header("Authorization","Bearer "+access)).andExpect(status().isUnauthorized());
        mvc.perform(post(AUTH+"refresh").header("Host","plataforma.localhost").cookie(r.getResponse().getCookie("RM_PLATFORM_REFRESH")).with(csrf())).andExpect(status().isUnauthorized());
        try(var c=conexao();var s=c.prepareStatement("update public.usuario_plataforma set ativo=true where id=?")){s.setObject(1,usuario);s.executeUpdate();}
        mvc.perform(get(AUTH+"me").header("Host","plataforma.localhost").header("Authorization","Bearer "+access)).andExpect(status().isUnauthorized());
        mvc.perform(post(AUTH+"refresh").header("Host","plataforma.localhost").cookie(r.getResponse().getCookie("RM_PLATFORM_REFRESH")).with(csrf())).andExpect(status().isUnauthorized());
        for(int i=0;i<5;i++)assertThat(login("incorreta").getResponse().getStatus()).isEqualTo(401);
        assertThat(login(senha).getResponse().getStatus()).isEqualTo(429);
    }
    @Test void camposDesconhecidosPaginaInvalidaEEndpointsNaoImplementadosFalhamFechado() throws Exception {
        mvc.perform(post(AUTH+"login").header("Host","plataforma.localhost").with(csrf()).contentType("application/json").content("{\"email\":\"teste@example.invalid\",\"senha\":\"incorreta\",\"tenant\":\"a\"}")).andExpect(status().isBadRequest());
        String access=token(login(senha));
        mvc.perform(get("/api/v1/plataforma/empresas?pagina=-1").header("Host","plataforma.localhost").header("Authorization","Bearer "+access)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/plataforma/impersonar").header("Host","plataforma.localhost").header("Authorization","Bearer "+access)).andExpect(status().isForbidden());
    }
    @Test void claimsInvalidasNaoAutenticamMesmoAssinadasPeloEmissor() throws Exception {
        String good=token(login(senha));var original=SignedJWT.parse(good).getJWTClaimsSet();
        for(String variation:List.of("exp","iss","aud","sid","sub","tenant","iat")) {
            var claims=new HashMap<String,Object>(original.getClaims());claims.put("iat",Instant.now().minusSeconds(900));claims.put("exp",Instant.now().plusSeconds(300));
            switch(variation){
                case "exp"->claims.put("exp",Instant.now().minusSeconds(600));
                case "iat"->claims.remove("iat");
                case "iss"->claims.put("iss","outro-emissor");
                case "aud"->claims.put("aud",List.of("restaurant-manager-empresa"));
                default->claims.put(variation,"invalido");
            }
            String changed=encoder.encode(JwtEncoderParameters.from(
                    JwsHeader.with(MacAlgorithm.HS256).build(),
                    JwtClaimsSet.builder().claims(c->c.putAll(claims)).build())).getTokenValue();
            mvc.perform(get(AUTH+"me").header("Host","plataforma.localhost").header("Authorization","Bearer "+changed)).andExpect(status().isUnauthorized());
        }
    }
    @Test void prazoAbsolutoNaoERenovadoEExpurgoNaoApagaFamiliaAindaValida() throws Exception {
        var first=login(senha);String access=token(first);var old=first.getResponse().getCookie("RM_PLATFORM_REFRESH");
        try(var c=conexao();var s=c.prepareStatement("update public.sessao_plataforma set criada_em=now()-interval '2 days',expira_em=now()-interval '1 second' where usuario_id=?")){s.setObject(1,usuario);s.executeUpdate();}
        mvc.perform(post(AUTH+"refresh").header("Host","plataforma.localhost").cookie(old).with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(get(AUTH+"me").header("Host","plataforma.localhost").header("Authorization","Bearer "+access)).andExpect(status().isUnauthorized());
        service.expurgar();
        assertThat(sessoesDaConta()).isEqualTo(1);
        try(var c=conexao();var s=c.prepareStatement("update public.sessao_plataforma set expira_em=now()-interval '25 hours' where usuario_id=?")){s.setObject(1,usuario);s.executeUpdate();}
        // O registro público conserva dados de outras execuções; cada chamada expurga um lote.
        // Exigir progresso na mesma população inicial evita confundir backlog com falha de retenção.
        Instant limite = Instant.now().minusSeconds(86400);
        long restantes = sessoesExpiradasAntesDe(limite);
        long maximoLotes = restantes;
        assertThat(restantes).isPositive();
        for (long lote = 0; lote < maximoLotes && sessoesDaConta() > 0; lote++) {
            service.expurgar();
            long depois = sessoesExpiradasAntesDe(limite);
            assertThat(depois).as("O lote %s precisa remover sessões antigas", lote + 1)
                    .isLessThan(restantes);
            restantes = depois;
        }
        assertThat(sessoesDaConta()).isZero();
    }
    @Test void origemBloqueadaNaoConsomeQuotaDaConta() throws Exception {
        String hash=HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(("origem:"+origem).getBytes(StandardCharsets.UTF_8)));
        try(var c=conexao();var s=c.prepareStatement("insert into public.limite_plataforma(chave,tentativas,inicio_em) values (?,100,now())")){s.setString(1,hash);s.executeUpdate();}
        assertThat(login(senha).getResponse().getStatus()).isEqualTo(429);
        origem="2001:db8::"+UUID.randomUUID().toString().substring(0,4);assertThat(login(senha).getResponse().getStatus()).isEqualTo(200);
    }
}
