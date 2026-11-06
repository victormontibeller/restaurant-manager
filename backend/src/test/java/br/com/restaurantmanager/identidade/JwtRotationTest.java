package br.com.restaurantmanager.identidade;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;

class JwtRotationTest {
    private final String atual=UUID.randomUUID().toString()+UUID.randomUUID();
    private final String anterior=UUID.randomUUID().toString()+UUID.randomUUID();
    private ApplicationContextRunner context() {
        return new ApplicationContextRunner().withUserConfiguration(JwtConfiguration.class)
                .withPropertyValues("rm.auth.secret="+atual,"rm.auth.key-id=v2",
                        "rm.auth.previous-secret=","rm.auth.previous-key-id=");
    }
    private String assinar(String secret,String kid,JWSAlgorithm algorithm) throws Exception {
        var header=new JWSHeader.Builder(algorithm);
        if(kid!=null)header.keyID(kid);
        var claims=new JWTClaimsSet.Builder().issuer("restaurant-manager").audience("restaurant-manager-empresa")
                .subject(UUID.randomUUID().toString()).issueTime(new Date())
                .expirationTime(Date.from(Instant.now().plusSeconds(300))).build();
        var signed=new SignedJWT(header.build(),claims);
        signed.sign(new MACSigner(secret.getBytes(StandardCharsets.UTF_8)));
        return signed.serialize();
    }
    @Test void emissaoUsaIdentificadorDaChaveAtiva() {
        context().run(c->{
            assertThat(c).hasNotFailed();
            var claims=JwtClaimsSet.builder().issuer("restaurant-manager").audience(List.of("restaurant-manager-empresa"))
                    .subject(UUID.randomUUID().toString()).issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build();
            var token=c.getBean(JwtEncoder.class).encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims));
            assertThat(token.getHeaders().get("kid")).isEqualTo("v2");
            assertThat(c.getBean(JwtDecoder.class).decode(token.getTokenValue()).getSubject()).isEqualTo(claims.getSubject());
        });
    }
    @Test void sobreposicaoAceitaAnteriorERemocaoRevogaSuaAssinatura() throws Exception {
        String antiga=assinar(anterior,"v1",JWSAlgorithm.HS256);
        String nova=assinar(atual,"v2",JWSAlgorithm.HS256);
        context().withPropertyValues("rm.auth.previous-secret="+anterior,"rm.auth.previous-key-id=v1").run(c->{
            assertThat(c).hasNotFailed();
            assertThat(c.getBean(JwtDecoder.class).decode(antiga).getSubject()).isNotBlank();
            assertThat(c.getBean(JwtDecoder.class).decode(nova).getSubject()).isNotBlank();
        });
        context().run(c->{
            assertThatThrownBy(()->c.getBean(JwtDecoder.class).decode(antiga)).isInstanceOf(JwtException.class);
            assertThat(c.getBean(JwtDecoder.class).decode(nova).getSubject()).isNotBlank();
        });
    }
    @Test void kidAusenteOuDesconhecidoNaoTentaTodasAsChaves() throws Exception {
        for(String kid:new String[]{null,"desconhecido","../../arquivo"}){
            String token=assinar(atual,kid,JWSAlgorithm.HS256);
            context().run(c->assertThatThrownBy(()->c.getBean(JwtDecoder.class).decode(token)).isInstanceOf(JwtException.class));
        }
    }
    @Test void algoritmoOuChaveDivergentesFalhamFechado() throws Exception {
        for(String token:new String[]{assinar(atual,"v2",JWSAlgorithm.HS384),assinar(anterior,"v2",JWSAlgorithm.HS256),"nao-e-jwt"}){
            context().run(c->assertThatThrownBy(()->c.getBean(JwtDecoder.class).decode(token)).isInstanceOf(JwtException.class));
        }
    }
    @Test void configuracaoAmbiguaOuIncompletaImpedeStartupSemExporSegredo() {
        for(String[] properties:new String[][]{
                {"rm.auth.secret=curta"},
                {"rm.auth.key-id="},
                {"rm.auth.key-id=../invalida"},
                {"rm.auth.key-id="+"a".repeat(65)},
                {"rm.auth.previous-key-id=v2","rm.auth.previous-secret="+anterior},
                {"rm.auth.previous-key-id=v1"},
                {"rm.auth.previous-secret="+anterior},
                {"rm.auth.previous-key-id=v1","rm.auth.previous-secret=curta"},
                {"rm.auth.previous-key-id=v1","rm.auth.previous-secret="+atual}}){
            context().withPropertyValues(properties).run(c->{
                assertThat(c).hasFailed();
                assertThat(c.getStartupFailure()).hasStackTraceContaining("Configuração de chaves JWT inválida.");
                assertThat(c.getStartupFailure().toString()).doesNotContain(atual,anterior);
            });
        }
    }
    @Test void configuracaoSemAnteriorPreservaValidadorDeClaims() throws Exception {
        var token=new AtomicReference<String>();
        context().run(c->{
            var claims=JwtClaimsSet.builder().issuer("outro").audience(List.of("restaurant-manager-empresa"))
                    .subject("teste").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build();
            token.set(c.getBean(JwtEncoder.class).encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue());
            assertThatThrownBy(()->c.getBean(JwtDecoder.class).decode(token.get())).isInstanceOf(JwtException.class);
        });
    }
    @Test void tokenExcessivoENuloSaoRecusadosSemParse() {
        context().run(c->{
            var decoder=c.getBean(JwtDecoder.class);
            assertThatThrownBy(()->decoder.decode(null)).isInstanceOf(JwtException.class);
            assertThatThrownBy(()->decoder.decode("a".repeat(8193))).isInstanceOf(JwtException.class);
        });
    }
    @Test void emissaoAusenteNaoPodeSerSintetizadaPeloConversor() throws Exception {
        for (String kid : List.of("v2", "v1")) {
            var claims = new JWTClaimsSet.Builder().issuer("restaurant-manager").audience("restaurant-manager-empresa")
                    .subject("teste").expirationTime(Date.from(Instant.now().plusSeconds(20))).build();
            var signed = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.HS256).keyID(kid).build(), claims);
            signed.sign(new MACSigner((kid.equals("v2") ? atual : anterior).getBytes(StandardCharsets.UTF_8)));
            context().withPropertyValues("rm.auth.previous-secret=" + anterior, "rm.auth.previous-key-id=v1").run(c ->
                    assertThatThrownBy(() -> c.getBean(JwtDecoder.class).decode(signed.serialize())).isInstanceOf(JwtException.class));
        }
    }
    @Test void assinaturaAnteriorComIdentificadorAtivoNaoUsaFallback() throws Exception {
        String token = assinar(anterior, "v2", JWSAlgorithm.HS256);
        context().withPropertyValues("rm.auth.previous-secret=" + anterior, "rm.auth.previous-key-id=v1").run(c ->
                assertThatThrownBy(() -> c.getBean(JwtDecoder.class).decode(token)).isInstanceOf(JwtException.class));
    }
    @Test void transicaoAceitaIdentificadorAutomaticoDoEmissorAnteriorQuandoCadastrado() {
        var legacy=org.springframework.security.oauth2.jwt.NimbusJwtEncoder.withSecretKey(
                new javax.crypto.spec.SecretKeySpec(anterior.getBytes(StandardCharsets.UTF_8),"HmacSHA256"))
                .algorithm(MacAlgorithm.HS256).build();
        var claims=JwtClaimsSet.builder().issuer("restaurant-manager").audience(List.of("restaurant-manager-empresa"))
                .subject("legado").issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(300)).build();
        var token=legacy.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims));
        String id=token.getHeaders().get("kid").toString();
        assertThat(id).hasSize(43);
        context().withPropertyValues("rm.auth.previous-secret="+anterior,"rm.auth.previous-key-id="+id).run(c->{
            assertThat(c).hasNotFailed();
            assertThat(c.getBean(JwtDecoder.class).decode(token.getTokenValue()).getSubject()).isEqualTo("legado");
        });
    }
}
