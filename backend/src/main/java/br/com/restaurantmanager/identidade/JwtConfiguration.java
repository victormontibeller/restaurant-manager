package br.com.restaurantmanager.identidade;

import java.nio.charset.StandardCharsets;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@Configuration
public class JwtConfiguration {
    static final String ISSUER = "restaurant-manager";
    static final String AUDIENCE = "restaurant-manager-empresa";
    @Bean SecretKey jwtKey(@Value("${rm.auth.secret:${RM_JWT_SECRET:}}") String secret) {
        if (secret.getBytes(StandardCharsets.UTF_8).length < 64) throw new IllegalStateException("Chave JWT privada obrigatória (mínimo 64 bytes).");
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }
    @Bean JwtEncoder jwtEncoder(SecretKey jwtKey) {
        return NimbusJwtEncoder.withSecretKey(jwtKey).algorithm(MacAlgorithm.HS256).build();
    }
    @Bean JwtDecoder jwtDecoder(SecretKey jwtKey) {
        var decoder = NimbusJwtDecoder.withSecretKey(jwtKey).macAlgorithm(MacAlgorithm.HS256).build();
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(JwtValidators.createDefaultWithIssuer(ISSUER),
                new JwtClaimValidator<java.util.List<String>>("aud", aud -> aud != null && aud.equals(java.util.List.of(AUDIENCE))),
                new JwtClaimValidator<java.time.Instant>("exp", exp -> exp != null),
                new JwtClaimValidator<java.time.Instant>("iat", iat -> iat != null && !iat.isAfter(java.time.Instant.now().plusSeconds(30)))));
        return decoder;
    }
}
