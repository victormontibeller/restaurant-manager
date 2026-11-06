package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.sql.DriverManager;
import java.util.UUID;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
class IdentidadeTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired org.springframework.security.oauth2.jwt.JwtEncoder encoder;
    private String email;
    private String senha;
    private String origem;
    private UUID usuario;

    @BeforeAll static void preparar() throws Exception { TestDatabase.prepare(); }
    @BeforeEach void conta() throws Exception {
        usuario = UUID.randomUUID();
        email = usuario + "@example.invalid";
        senha = UUID.randomUUID().toString();
        origem = "2001:db8:" + usuario.toString().substring(0,4) + ":" + usuario.toString().substring(4,8) + "::1";
        for (String schema : new String[]{FundacaoTest.A, FundacaoTest.B}) {
            try (var c = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
                 var s = c.prepareStatement("insert into " + schema + ".usuario(id,email,senha_hash,perfil,email_verificado) values (?,?,?,'ADMINISTRADOR',true)")) {
                s.setObject(1, usuario); s.setString(2, email); s.setString(3, new BCryptPasswordEncoder(12).encode(senha)); s.executeUpdate();
            }
        }
    }
    private org.springframework.test.web.servlet.MvcResult login(String host, String password) throws Exception {
        return mvc.perform(post("/api/v1/auth/login").header("Host", host).with(csrf()).with(r -> { r.setRemoteAddr(origem); return r; })
                .contentType("application/json").content(mapper.writeValueAsString(java.util.Map.of("email", email, "senha", password)))).andReturn();
    }
    private org.springframework.test.web.servlet.request.RequestPostProcessor csrf() throws Exception {
        var response = mvc.perform(get("/api/v1/auth/csrf").header("Host", "a.localhost")).andReturn().getResponse();
        var body = mapper.readTree(response.getContentAsString());
        Cookie cookie = response.getCookie("__Host-RM_CSRF");
        return request -> {
            var cookies = new java.util.ArrayList<Cookie>();
            if (request.getCookies() != null) cookies.addAll(java.util.List.of(request.getCookies()));
            cookies.add(cookie); request.setCookies(cookies.toArray(Cookie[]::new));
            request.addHeader(body.get("headerName").asText(), body.get("token").asText()); return request;
        };
    }
    private String token(org.springframework.test.web.servlet.MvcResult result) throws Exception {
        assertThat(result.getResponse().getStatus()).isEqualTo(200);
        return mapper.readTree(result.getResponse().getContentAsString()).get("accessToken").asText();
    }
    @AfterEach void limparSomenteContasDesteTeste() throws Exception {
        try (var c = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"))) {
            br.com.restaurantmanager.tenancy.Migrations.verifyIdentity(c, "rm_test", "rm_test_owner");
            for (String schema : new String[]{FundacaoTest.A, FundacaoTest.B}) {
                for (String sql : new String[]{
                        "delete from " + schema + ".refresh_token where sessao_id in (select id from " + schema + ".sessao where usuario_id=?)",
                        "delete from " + schema + ".sessao where usuario_id=?",
                        "delete from " + schema + ".usuario where id=?"}) {
                    try (var s = c.prepareStatement(sql)) { s.setObject(1,usuario); s.executeUpdate(); }
                }
            }
        }
    }
    @Test void csrfRealObrigatorioMesmoComBearerELimpaContexto() throws Exception {
        var csrfResponse = mvc.perform(get("/api/v1/auth/csrf").header("Host", "a.localhost")).andExpect(status().isOk()).andReturn();
        var csrfBody = mapper.readTree(csrfResponse.getResponse().getContentAsString());
        Cookie cookie = csrfResponse.getResponse().getCookie("__Host-RM_CSRF");
        assertThat(cookie).isNotNull(); assertThat(cookie.getDomain()).isNull(); assertThat(cookie.getSecure()).isTrue();
        String body = mapper.writeValueAsString(java.util.Map.of("email",email,"senha",senha));
        var logged = mvc.perform(post("/api/v1/auth/login").header("Host", "a.localhost").cookie(cookie)
                .header(csrfBody.get("headerName").asText(),csrfBody.get("token").asText()).contentType("application/json").content(body)).andExpect(status().isOk()).andReturn();
        String access = token(logged);
        for (String action : new String[]{"login","refresh","logout"}) {
            mvc.perform(post("/api/v1/auth/"+action).header("Host", "a.localhost").header("Authorization","Bearer "+access)
                    .cookie(logged.getResponse().getCookie("RM_REFRESH")).contentType("application/json").content(body)).andExpect(status().isForbidden());
        }
        assertThat(br.com.restaurantmanager.tenancy.TenantScope.current()).isEqualTo("__none__");
    }
    @Test void refreshConcorrenteTemUmVencedorERevogaFamiliaPorReuso() throws Exception {
        var first = login("a.localhost", senha); token(first);
        Cookie refresh = first.getResponse().getCookie("RM_REFRESH");
        var start = new java.util.concurrent.CyclicBarrier(2);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            java.util.concurrent.Callable<Integer> task = () -> {
                start.await(10, java.util.concurrent.TimeUnit.SECONDS);
                return mvc.perform(post("/api/v1/auth/refresh").header("Host", "a.localhost").cookie(refresh).with(csrf())).andReturn().getResponse().getStatus();
            };
            var a = executor.submit(task); var b = executor.submit(task);
            assertThat(java.util.List.of(a.get(20,java.util.concurrent.TimeUnit.SECONDS),b.get(20,java.util.concurrent.TimeUnit.SECONDS))).containsExactlyInAnyOrder(200,401);
        }
        mvc.perform(get("/api/v1/auth/me").header("Host","a.localhost").header("Authorization","Bearer "+token(first))).andExpect(status().isUnauthorized());
    }
    @Test void jwtExpiradoIssuerAudienceAssinaturaEClaimsInvalidosSaoNegados() throws Exception {
        String good = token(login("a.localhost", senha));
        var original = com.nimbusds.jwt.SignedJWT.parse(good).getJWTClaimsSet();
        for (String variation : new String[]{"exp","iss","aud","sid","tenant","sub"}) {
            var claims = new java.util.HashMap<String,Object>(original.getClaims());
            claims.put("iat",java.time.Instant.now().minusSeconds(900));
            claims.put("exp",java.time.Instant.now().plusSeconds(300));
            switch (variation) {
                case "exp" -> claims.put("exp", java.time.Instant.now().minusSeconds(600));
                case "iss" -> claims.put("iss", "outro-emissor");
                case "aud" -> claims.put("aud", java.util.List.of("restaurant-manager-plataforma"));
                default -> claims.put(variation, "invalido");
            }
            String changed = encoder.encode(org.springframework.security.oauth2.jwt.JwtEncoderParameters.from(
                    org.springframework.security.oauth2.jwt.JwsHeader.with(org.springframework.security.oauth2.jose.jws.MacAlgorithm.HS256).build(),
                    org.springframework.security.oauth2.jwt.JwtClaimsSet.builder().claims(c -> c.putAll(claims)).build())).getTokenValue();
            mvc.perform(get("/api/v1/auth/me").header("Host","a.localhost").header("Authorization","Bearer "+changed)).andExpect(status().isUnauthorized());
        }
        String[] parts = good.split("\\.");
        String invalidSignature = parts[0]+"."+parts[1]+"."+(parts[2].startsWith("A")?"B":"A")+parts[2].substring(1);
        mvc.perform(get("/api/v1/auth/me").header("Host","a.localhost").header("Authorization","Bearer "+invalidSignature)).andExpect(status().isUnauthorized());
    }
    @Test void origemBloqueadaNaoConsomeLimiteDeOutraConta() throws Exception {
        String origem = "2001:db8::" + UUID.randomUUID().toString().substring(0,4);
        String chaveOrigem = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(("origem:"+origem).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        String chaveEmail = java.util.HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256").digest(("email:"+email).getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        try (var c = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"))) {
            try (var s = c.prepareStatement("insert into "+FundacaoTest.A+".limite_login(chave,tentativas,inicio_em) values (?,100,now()) on conflict(chave) do update set tentativas=100,inicio_em=now()")) { s.setString(1,chaveOrigem); s.executeUpdate(); }
            mvc.perform(post("/api/v1/auth/login").header("Host","a.localhost").with(csrf()).with(r -> {r.setRemoteAddr(origem); return r;})
                    .contentType("application/json").content(mapper.writeValueAsString(java.util.Map.of("email",email,"senha",senha)))).andExpect(status().isTooManyRequests());
            try (var s = c.prepareStatement("select count(*) from "+FundacaoTest.A+".limite_login where chave=?")) {
                s.setString(1,chaveEmail); try (var r=s.executeQuery()) { r.next(); assertThat(r.getInt(1)).isZero(); }
            }
        }
    }
    @Test void loginValidoIsolaTenantESessao() throws Exception {
        var result = login("a.localhost", senha);
        String access = token(result);
        assertThat(result.getResponse().getHeader("Cache-Control")).contains("no-store");
        var cookie = result.getResponse().getCookie("RM_REFRESH");
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isTrue(); assertThat(cookie.getSecure()).isTrue();
        assertThat(cookie.getPath()).isEqualTo("/api/v1/auth");
        assertThat(cookie.getAttribute("SameSite")).isEqualTo("Strict");
        mvc.perform(get("/api/v1/auth/me").header("Host", "a.localhost").header("Authorization", "Bearer " + access)).andExpect(status().isOk());
        mvc.perform(get("/api/v1/auth/me").header("Host", "b.localhost").header("Authorization", "Bearer " + access)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/plataforma/empresas").header("Host", "a.localhost").header("Authorization", "Bearer " + access)).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/plataforma/empresas").header("Host", "plataforma.localhost").header("Authorization", "Bearer " + access)).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").header("Host", "a.localhost")).andExpect(status().isUnauthorized());
    }
    @Test void refreshRotacionaEReusoRevogaFamiliaMesmoComAccessValido() throws Exception {
        var first = login("a.localhost", senha); String access = token(first);
        Cookie old = first.getResponse().getCookie("RM_REFRESH");
        var refreshed = mvc.perform(post("/api/v1/auth/refresh").header("Host", "a.localhost").cookie(old).with(csrf())).andExpect(status().isOk()).andReturn();
        String second = token(refreshed);
        assertThat(refreshed.getResponse().getCookie("RM_REFRESH").getValue()).isNotEqualTo(old.getValue());
        mvc.perform(post("/api/v1/auth/refresh").header("Host", "a.localhost").cookie(old).with(csrf())).andExpect(status().isUnauthorized());
        for (String jwt : new String[]{access, second}) mvc.perform(get("/api/v1/auth/me").header("Host", "a.localhost").header("Authorization", "Bearer " + jwt)).andExpect(status().isUnauthorized());
    }
    @Test void logoutRevogaNoServidorENaoAceitaCsrfAusente() throws Exception {
        var first = login("a.localhost", senha); String access = token(first);
        Cookie refresh = first.getResponse().getCookie("RM_REFRESH");
        mvc.perform(post("/api/v1/auth/logout").header("Host", "a.localhost").cookie(refresh)).andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/logout").header("Host", "a.localhost").cookie(refresh).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/v1/auth/me").header("Host", "a.localhost").header("Authorization", "Bearer " + access)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/refresh").header("Host", "a.localhost").cookie(refresh).with(csrf())).andExpect(status().isUnauthorized());
    }
    @Test void senhaErradaNaoEnumeraELimitePersiste() throws Exception {
        assertThat(login("a.localhost", "incorreta").getResponse().getStatus()).isEqualTo(401);
        for (int i=0; i<4; i++) assertThat(login("a.localhost", "incorreta").getResponse().getStatus()).isEqualTo(401);
        assertThat(login("a.localhost", senha).getResponse().getStatus()).isEqualTo(429);
        assertThat(login("b.localhost", senha).getResponse().getStatus()).isEqualTo(200);
    }
    @Test void inativacaoInvalidaAccessSemEsperarExpirar() throws Exception {
        String access = token(login("a.localhost", senha));
        try (var c = DriverManager.getConnection(System.getenv("RM_DB_URL"), System.getenv("RM_MIGRATION_USER"), System.getenv("RM_MIGRATION_PASSWORD"));
             var s = c.prepareStatement("update " + FundacaoTest.A + ".usuario set ativo=false where id=?")) { s.setObject(1,usuario); s.executeUpdate(); }
        mvc.perform(get("/api/v1/auth/me").header("Host", "a.localhost").header("Authorization", "Bearer " + access)).andExpect(status().isUnauthorized());
    }
    @Test void loginRecusaCamposDesconhecidosEDominioNaoRegistrado() throws Exception {
        mvc.perform(post("/api/v1/auth/login").header("Host", "a.localhost").with(csrf()).contentType("application/json")
                .content("{\"email\":\"teste@example.invalid\",\"senha\":\"incorreta\",\"perfil\":\"ADMINISTRADOR\"}")).andExpect(status().isBadRequest());
        assertThat(login("invasor.localhost", senha).getResponse().getStatus()).isEqualTo(404);
    }
}
