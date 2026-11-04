package br.com.restaurantmanager.identidade;

import br.com.restaurantmanager.tenancy.TenantScope;
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
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdentidadeService {
    private final IdentidadeRepository repository;
    private final JwtEncoder encoder;
    private final BCryptPasswordEncoder passwords = new BCryptPasswordEncoder(12);
    private final SecureRandom random = new SecureRandom();
    private final String dummyHash = passwords.encode(UUID.randomUUID().toString());
    public IdentidadeService(IdentidadeRepository repository, JwtEncoder encoder) { this.repository = repository; this.encoder = encoder; }
    public record Tokens(String accessToken, String refreshToken, long expiresIn) {
        @Override public String toString() { return "Tokens[protegidos]"; }
    }
    @Transactional(noRollbackFor = AuthFailure.class)
    public Tokens login(String email, String senha, String origem) {
        // Mesma ordem da administração: política antes de usuário/sessão.
        // Inativação posterior espera o INSERT e revoga também esta sessão.
        repository.bloquearAlteracoesDeAcesso();
        String normalized = email.strip().toLowerCase(Locale.ROOT);
        Instant agora = Instant.now();
        int ipAttempts = repository.tentativa(hash("origem:" + origem), agora);
        if (ipAttempts > 100) throw new AuthFailure(429, "LIMITE_TENTATIVAS", "Muitas tentativas. Aguarde quinze minutos.");
        int attempts = repository.tentativa(hash("email:" + normalized), agora);
        if (attempts > 5) throw new AuthFailure(429, "LIMITE_TENTATIVAS", "Muitas tentativas. Aguarde quinze minutos.");
        var user = repository.porEmail(normalized).orElse(null);
        boolean valid = senha.getBytes(StandardCharsets.UTF_8).length <= 72
                && passwords.matches(senha, user == null ? dummyHash : user.senhaHash);
        if (!valid || user == null || !user.ativo) throw AuthFailure.invalid();
        repository.limparTentativas(hash("email:" + normalized));
        var session = new Sessao(user.id, agora); repository.salvar(session);
        return emitir(session, agora);
    }
    @Transactional(noRollbackFor = AuthFailure.class)
    public Tokens refresh(String raw) {
        RefreshToken refresh = localizar(raw);
        Sessao session = repository.sessao(refresh.sessaoId, true);
        repository.atualizar(refresh); // reler depois do lock: outro refresh pode ter consumido o token.
        Instant agora = Instant.now();
        if (refresh.usadoEm != null) { session.revogadaEm = agora; throw AuthFailure.invalid(); }
        Usuario user = repository.usuario(session.usuarioId);
        if (!session.valida(agora) || user == null || !user.ativo) throw AuthFailure.invalid();
        refresh.usadoEm = agora;
        return emitir(session, agora);
    }
    @Transactional
    public void logout(String raw) {
        RefreshToken refresh = localizar(raw);
        repository.sessao(refresh.sessaoId, true).revogadaEm = Instant.now();
    }
    @Transactional(noRollbackFor = AuthFailure.class)
    public void reautenticar(IdentidadeAtual ator, String senha) {
        if (!empresaAtual().equals(ator.empresaId())) throw AuthFailure.invalid();
        Instant agora = Instant.now();
        String chave = hash("reautenticar:" + ator.usuarioId());
        if (repository.tentativa(chave, agora) > 5) throw new AuthFailure(429, "LIMITE_TENTATIVAS", "Muitas tentativas. Aguarde quinze minutos.");
        Sessao sessao = repository.sessao(ator.sessaoId(), true);
        Usuario usuario = repository.usuario(ator.usuarioId());
        if (sessao == null || !sessao.usuarioId.equals(ator.usuarioId()) || !sessao.valida(agora) || usuario == null || !usuario.ativo) throw AuthFailure.invalid();
        if (senha.getBytes(StandardCharsets.UTF_8).length > 72 || !passwords.matches(senha, usuario.senhaHash)) {
            throw new AuthFailure(422, "CONFIRMACAO_INVALIDA", "Senha de confirmação inválida.");
        }
        sessao.reautenticadaEm = agora;
        repository.limparTentativas(chave);
    }
    @Transactional(readOnly = true)
    public IdentidadeAtual validar(Jwt jwt) {
        try {
            UUID empresa = empresaAtual();
            if (!empresa.toString().equals(jwt.getClaimAsString("tenant"))) throw AuthFailure.invalid();
            UUID userId = UUID.fromString(jwt.getSubject());
            UUID sessionId = UUID.fromString(jwt.getClaimAsString("sid"));
            Sessao session = repository.sessao(sessionId, false);
            Usuario user = repository.usuario(userId);
            if (session == null || !session.usuarioId.equals(userId) || !session.valida(Instant.now()) || user == null || !user.ativo) throw AuthFailure.invalid();
            return new IdentidadeAtual(user.id, session.id, empresa, user.perfil, user.emailVerificado);
        } catch (IllegalArgumentException | NullPointerException error) { throw AuthFailure.invalid(); }
    }
    private RefreshToken localizar(String raw) {
        if (raw == null || !raw.matches("[A-Za-z0-9_-]{43}")) throw AuthFailure.invalid();
        RefreshToken token = repository.refresh(hash(raw));
        if (token == null) throw AuthFailure.invalid();
        return token;
    }
    private Tokens emitir(Sessao session, Instant agora) {
        byte[] bytes = new byte[32]; random.nextBytes(bytes);
        String refresh = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        repository.salvar(new RefreshToken(hash(refresh), session.id));
        var claims = JwtClaimsSet.builder().issuer(JwtConfiguration.ISSUER).audience(List.of(JwtConfiguration.AUDIENCE))
                .subject(session.usuarioId.toString()).id(UUID.randomUUID().toString()).issuedAt(agora).expiresAt(agora.plusSeconds(300))
                .claim("tenant", empresaAtual().toString()).claim("sid", session.id.toString()).build();
        String access = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new Tokens(access, refresh, 300);
    }
    static String hash(String value) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8))); }
        catch (NoSuchAlgorithmException error) { throw new IllegalStateException("SHA-256 indisponível.", error); }
    }
    static UUID empresaAtual() {
        String schema = TenantScope.current();
        if (!schema.matches("t_[a-f0-9]{32}")) throw AuthFailure.invalid();
        String id = schema.substring(2);
        return UUID.fromString(id.substring(0,8)+"-"+id.substring(8,12)+"-"+id.substring(12,16)+"-"+id.substring(16,20)+"-"+id.substring(20));
    }
}
