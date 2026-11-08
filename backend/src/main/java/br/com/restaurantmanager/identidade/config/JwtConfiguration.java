package br.com.restaurantmanager.identidade.config;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.MappedJwtClaimSetConverter;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

@Configuration
public class JwtConfiguration {
    public static final String ISSUER = "restaurant-manager";
    public static final String AUDIENCE = "restaurant-manager-empresa";

    record Chaves(String ativaId, SecretKey ativa, String anteriorId, SecretKey anterior) {
        @Override
        public String toString() {
            return "Chaves[protegidas]";
        }
    }

    @Bean
    Chaves jwtKeys(@Value("${rm.auth.secret:${RM_JWT_SECRET:}}") String secret,
            @Value("${rm.auth.key-id:${RM_JWT_KEY_ID:v1}}") String id,
            @Value("${rm.auth.previous-secret:${RM_JWT_PREVIOUS_SECRET:}}") String previous,
            @Value("${rm.auth.previous-key-id:${RM_JWT_PREVIOUS_KEY_ID:}}") String previousId) {
        if (!identificadorValido(id) || secret.getBytes(StandardCharsets.UTF_8).length < 64
                || previous.isEmpty() != previousId.isEmpty()
                || (!previous.isEmpty() && (!identificadorValido(previousId) || id.equals(previousId)
                    || secret.equals(previous) || previous.getBytes(StandardCharsets.UTF_8).length < 64))) {
            throw new IllegalStateException("Configuração de chaves JWT inválida.");
        }
        return new Chaves(id, chave(secret), previousId, previous.isEmpty() ? null : chave(previous));
    }

    @Bean
    JwtEncoder jwtEncoder(Chaves keys) {
        return NimbusJwtEncoder.withSecretKey(keys.ativa()).algorithm(MacAlgorithm.HS256)
                .jwkPostProcessor(builder -> builder.keyID(keys.ativaId())).build();
    }

    @Bean
    @Primary
    JwtDecoder jwtDecoder(Chaves keys) {
        return decoder(keys, AUDIENCE);
    }

    @Bean("platformJwtDecoder")
    JwtDecoder platformJwtDecoder(Chaves keys) {
        return decoder(keys, "restaurant-manager-plataforma");
    }

    @Bean("mesaJwtDecoder")
    JwtDecoder mesaJwtDecoder(Chaves keys) {
        return decoder(keys, "restaurant-manager-mesa");
    }

    private JwtDecoder decoder(Chaves keys, String audience) {
        var configured = new LinkedHashMap<String, JwtDecoder>();
        configured.put(keys.ativaId(), decoder(keys.ativa(), audience));
        if (keys.anterior() != null) {
            configured.put(keys.anteriorId(), decoder(keys.anterior(), audience));
        }
        Map<String, JwtDecoder> decoders = Map.copyOf(configured);
        return token -> {
            if (token == null || token.length() > 8192) {
                throw invalido();
            }
            try {
                // kid não é identidade autenticada: serve apenas para escolher uma chave LOCAL.
                // Nunca consultar URL, arquivo ou tentar outra chave se a assinatura falhar.
                var header = SignedJWT.parse(token).getHeader();
                if (!JWSAlgorithm.HS256.equals(header.getAlgorithm()) || !identificadorValido(header.getKeyID())) {
                    throw invalido();
                }
                JwtDecoder selected = decoders.get(header.getKeyID());
                if (selected == null) {
                    throw invalido();
                }
                return selected.decode(token);
            } catch (ParseException error) {
                throw invalido();
            }
        };
    }

    private static boolean identificadorValido(String id) {
        return id != null && id.matches("[A-Za-z0-9_-]{1,64}");
    }

    private static SecretKey chave(String secret) {
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    private static BadJwtException invalido() {
        return new BadJwtException("Token JWT inválido.");
    }

    private static JwtDecoder decoder(SecretKey key, String audience) {
        var decoder = NimbusJwtDecoder.withSecretKey(key).macAlgorithm(MacAlgorithm.HS256).build();
        var converter = MappedJwtClaimSetConverter.withDefaults(Map.of());
        decoder.setClaimSetConverter(claims -> {
            // Exigir a emissão original, antes de qualquer preenchimento do conversor.
            if (claims.get("iat") == null) {
                throw invalido();
            }
            return converter.convert(claims);
        });
        decoder.setJwtValidator(new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(ISSUER),
                new JwtClaimValidator<List<String>>("aud", aud -> aud != null && aud.equals(List.of(audience))),
                new JwtClaimValidator<Instant>("exp", exp -> exp != null),
                new JwtClaimValidator<Instant>("iat", iat -> iat != null && !iat.isAfter(Instant.now().plusSeconds(30)))));
        return decoder;
    }
}
