package br.com.restaurantmanager.identidade.services;

import br.com.restaurantmanager.identidade.config.JwtConfiguration;
import br.com.restaurantmanager.identidade.dtos.TokensIdentidade;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.models.RefreshToken;
import br.com.restaurantmanager.identidade.models.Sessao;
import br.com.restaurantmanager.identidade.models.Usuario;
import br.com.restaurantmanager.identidade.repositories.IdentidadeRepository;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentidadeService {
    private final IdentidadeRepository repository;
    private final JwtEncoder encoder;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);
    private final SecureRandom random = new SecureRandom();
    private final String dummyHash = passwords.encode(UUID.randomUUID().toString());

    public IdentidadeService(IdentidadeRepository repository, JwtEncoder encoder) {
        this.repository = repository;
        this.encoder = encoder;
    }

    @Transactional(noRollbackFor = AuthFailure.class)
    public TokensIdentidade login(String email, String senha, String origem) {
        // Mesma ordem da administração: política antes de usuário/sessão.
        // Inativação posterior espera o INSERT e revoga também esta sessão.
        repository.bloquearAlteracoesDeAcesso();
        String normalized = email.strip().toLowerCase(Locale.ROOT);
        Instant agora = Instant.now();
        int ipAttempts = repository.tentativa(hash("origem:" + origem), agora);
        if (ipAttempts > 100) {
            throw new AuthFailure(429, "LIMITE_TENTATIVAS", "Muitas tentativas. Aguarde quinze minutos.");
        }
        int attempts = repository.tentativa(hash("email:" + normalized), agora);
        if (attempts > 5) {
            throw new AuthFailure(429, "LIMITE_TENTATIVAS", "Muitas tentativas. Aguarde quinze minutos.");
        }
        var user = repository.porEmail(normalized).orElse(null);
        boolean valid = senha.getBytes(StandardCharsets.UTF_8).length <= 72
                && passwords.matches(senha, user == null ? dummyHash : user.getSenhaHash());
        if (!valid || user == null || !user.isAtivo()) {
            throw AuthFailure.invalid();
        }
        repository.limparTentativas(hash("email:" + normalized));
        var session = Sessao.criar(user.getId(), agora);
        repository.salvar(session);
        return emitir(session, agora);
    }

    @Transactional(noRollbackFor = AuthFailure.class)
    public TokensIdentidade refresh(String raw) {
        RefreshToken refresh = localizar(raw);
        Sessao session = repository.sessao(refresh.getSessaoId(), true);
        // Expurgo pode ter concluído após localizar o hash.
        if (session == null) {
            throw AuthFailure.invalid();
        }
        // Reler depois do lock: outro refresh pode ter consumido o token.
        repository.atualizar(refresh);
        Instant agora = Instant.now();
        if (refresh.getUsadoEm() != null) {
            session.revogar(agora);
            throw AuthFailure.invalid();
        }
        Usuario user = repository.usuario(session.getUsuarioId());
        if (!session.valida(agora) || user == null || !user.isAtivo()) {
            throw AuthFailure.invalid();
        }
        refresh.consumir(agora);
        return emitir(session, agora);
    }

    @Transactional
    public void logout(String raw) {
        RefreshToken refresh = localizar(raw);
        Sessao session = repository.sessao(refresh.getSessaoId(), true);
        if (session == null) {
            throw AuthFailure.invalid();
        }
        session.revogar(Instant.now());
    }

    @Transactional(noRollbackFor = AuthFailure.class)
    public void reautenticar(IdentidadeAtual ator, String senha) {
        if (!empresaAtual().equals(ator.empresaId())) {
            throw AuthFailure.invalid();
        }
        Instant agora = Instant.now();
        String chave = hash("reautenticar:" + ator.usuarioId());
        if (repository.tentativa(chave, agora) > 5) {
            throw new AuthFailure(429, "LIMITE_TENTATIVAS", "Muitas tentativas. Aguarde quinze minutos.");
        }
        Sessao sessao = repository.sessao(ator.sessaoId(), true);
        Usuario usuario = repository.usuario(ator.usuarioId());
        if (sessao == null || !sessao.getUsuarioId().equals(ator.usuarioId()) || !sessao.valida(agora)
                || usuario == null || !usuario.isAtivo()) {
            throw AuthFailure.invalid();
        }
        if (senha.getBytes(StandardCharsets.UTF_8).length > 72 || !passwords.matches(senha, usuario.getSenhaHash())) {
            throw new AuthFailure(422, "CONFIRMACAO_INVALIDA", "Senha de confirmação inválida.");
        }
        sessao.reautenticar(agora);
        repository.limparTentativas(chave);
    }

    @Transactional(readOnly = true)
    public IdentidadeAtual validar(Jwt jwt) {
        try {
            UUID empresa = empresaAtual();
            if (!empresa.toString().equals(jwt.getClaimAsString("tenant"))) {
                throw AuthFailure.invalid();
            }
            UUID userId = UUID.fromString(jwt.getSubject());
            UUID sessionId = UUID.fromString(jwt.getClaimAsString("sid"));
            Sessao session = repository.sessao(sessionId, false);
            Usuario user = repository.usuario(userId);
            if (session == null || !session.getUsuarioId().equals(userId) || !session.valida(Instant.now())
                    || user == null || !user.isAtivo()) {
                throw AuthFailure.invalid();
            }
            return new IdentidadeAtual(user.getId(), session.getId(), empresa, user.getPerfil(), user.isEmailVerificado());
        } catch (IllegalArgumentException | NullPointerException error) {
            throw AuthFailure.invalid();
        }
    }

    private RefreshToken localizar(String raw) {
        if (raw == null || !raw.matches("[A-Za-z0-9_-]{43}")) {
            throw AuthFailure.invalid();
        }
        RefreshToken token = repository.refresh(hash(raw));
        if (token == null) {
            throw AuthFailure.invalid();
        }
        return token;
    }

    private TokensIdentidade emitir(Sessao session, Instant agora) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        repository.salvar(RefreshToken.criar(hash(refresh), session.getId()));
        var claims = JwtClaimsSet.builder()
                .issuer(JwtConfiguration.ISSUER)
                .audience(List.of(JwtConfiguration.AUDIENCE))
                .subject(session.getUsuarioId().toString())
                .id(UUID.randomUUID().toString())
                .issuedAt(agora)
                .expiresAt(agora.plusSeconds(300))
                .claim("tenant", empresaAtual().toString())
                .claim("sid", session.getId().toString())
                .build();
        String access = encoder.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new TokensIdentidade(access, refresh, 300);
    }

    static String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 indisponível.", error);
        }
    }

    static UUID empresaAtual() {
        String schema = TenantScope.current();
        if (!schema.matches("t_[a-f0-9]{32}")) {
            throw AuthFailure.invalid();
        }
        String id = schema.substring(2);
        return UUID.fromString(id.substring(0, 8) + "-" + id.substring(8, 12) + "-"
                + id.substring(12, 16) + "-" + id.substring(16, 20) + "-" + id.substring(20));
    }
}
