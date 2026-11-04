package br.com.restaurantmanager.plataforma;

import br.com.restaurantmanager.identidade.AuthFailure;
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
import java.util.function.Supplier;
import javax.sql.DataSource;
import org.springframework.jdbc.support.JdbcTransactionManager;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class PlataformaService {
    private final PlataformaRepository repository;
    private final JwtEncoder encoder;
    private final TransactionTemplate transaction;
    private final BCryptPasswordEncoder passwords=new BCryptPasswordEncoder(12);
    private final String dummy=passwords.encode(UUID.randomUUID().toString());
    private final SecureRandom random=new SecureRandom();
    private final boolean retencaoAgendada;
    public PlataformaService(PlataformaRepository repository,JwtEncoder encoder,DataSource source,
                             @Value("${rm.auth.retencao-agendada:true}") boolean retencaoAgendada) {
        this.repository=repository;this.encoder=encoder;this.retencaoAgendada=retencaoAgendada;
        // Sem EntityManager multi-tenant no contexto público e sem substituir o manager JPA.
        transaction=new TransactionTemplate(new JdbcTransactionManager(source));transaction.setTimeout(10);
    }
    public record Identidade(UUID usuarioId,UUID sessaoId,String perfil) {}
    public record Tokens(String accessToken,String refreshToken,long expiresIn) {
        @Override public String toString() { return "TokensPlataforma[protegidos]"; }
    }
    private record Resultado<T>(T valor,AuthFailure erro) {}
    private <T> T executar(Supplier<T> operation) {
        if(!TenantScope.current().equals("__none__") || TransactionSynchronizationManager.isActualTransactionActive())throw AuthFailure.invalid();
        var result=transaction.execute(status->{try{return new Resultado<T>(operation.get(),null);}catch(AuthFailure failure){return new Resultado<T>(null,failure);}});
        if(result.erro()!=null)throw result.erro();return result.valor();
    }
    public Tokens login(String email,String senha,String origem) {
        return executar(()->{
            Instant agora=Instant.now();String normalized=email.strip().toLowerCase(Locale.ROOT);
            if(repository.tentativa(hash("origem:"+origem),agora)>100)throw limite();
            String key=hash("email:"+normalized);
            if(repository.tentativa(key,agora)>5)throw limite();
            var user=repository.usuarioPorEmail(normalized);
            boolean valid=senha.getBytes(StandardCharsets.UTF_8).length<=72 && passwords.matches(senha,user==null?dummy:user.hash());
            if(!valid || user==null || !user.ativo())throw AuthFailure.invalid();
            repository.limparTentativas(key);var session=repository.criar(user.id(),Instant.now());repository.auditar(user.id(),"LOGIN");
            return emitir(session,Instant.now());
        });
    }
    public Tokens refresh(String raw) {
        return executar(()->{
            String hash=hashRefresh(raw);var old=repository.refresh(hash);if(old==null)throw AuthFailure.invalid();
            var session=repository.sessao(old.sessao(),true);if(session==null)throw AuthFailure.invalid();
            old=repository.refresh(hash);if(old==null)throw AuthFailure.invalid();
            Instant agora=Instant.now();
            if(old.usado()!=null){repository.revogar(session.id(),agora);repository.auditar(session.usuario(),"REUSO_REFRESH");throw AuthFailure.invalid();}
            exigirSessao(session,agora);repository.consumir(hash,agora);return emitir(session,agora);
        });
    }
    public void logout(String raw) {
        executar(()->{var old=repository.refresh(hashRefresh(raw));if(old==null)throw AuthFailure.invalid();
            var session=repository.sessao(old.sessao(),true);if(session==null)throw AuthFailure.invalid();
            repository.revogar(session.id(),Instant.now());repository.auditar(session.usuario(),"LOGOUT");return null;});
    }
    public Identidade validar(Jwt jwt) {
        return executar(()->{
            try {
                if(jwt.hasClaim("tenant"))throw AuthFailure.invalid();
                var session=repository.sessao(UUID.fromString(jwt.getClaimAsString("sid")),false);
                exigirSessao(session,Instant.now());if(!session.usuario().equals(UUID.fromString(jwt.getSubject())))throw AuthFailure.invalid();
                return new Identidade(session.usuario(),session.id(),"OPERADOR_SAAS");
            }catch(IllegalArgumentException | NullPointerException failure){throw AuthFailure.invalid();}
        });
    }
    public List<PlataformaRepository.Empresa> empresas(Identidade ator,int pagina) {
        return executar(()->{
            if(ator==null)throw AuthFailure.invalid();var session=repository.sessao(ator.sessaoId(),true);exigirSessao(session,Instant.now());
            if(!session.usuario().equals(ator.usuarioId()))throw AuthFailure.invalid();
            if(pagina<0 || pagina>10000)throw new AuthFailure(400,"PAGINA_INVALIDA","Página inválida.");return repository.empresas(pagina);
        });
    }
    private void exigirSessao(PlataformaRepository.Sessao session,Instant agora) {
        if(session==null || !session.valida(agora) || !repository.ativo(session.usuario()))throw AuthFailure.invalid();
    }
    private Tokens emitir(PlataformaRepository.Sessao session,Instant agora) {
        byte[] bytes=new byte[32];random.nextBytes(bytes);String refresh=Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        repository.novoRefresh(hash(refresh),session.id());
        var claims=JwtClaimsSet.builder().issuer("restaurant-manager").audience(List.of("restaurant-manager-plataforma"))
                .subject(session.usuario().toString()).id(UUID.randomUUID().toString()).issuedAt(agora).expiresAt(agora.plusSeconds(300)).claim("sid",session.id().toString()).build();
        String access=encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(),claims)).getTokenValue();
        return new Tokens(access,refresh,300);
    }
    public int expurgar() { return executar(()->repository.expurgar(Instant.now())); }
    @Scheduled(initialDelay=60000,fixedDelay=600000)
    public void reter() {
        if(!retencaoAgendada)return;
        try{expurgar();}catch(RuntimeException failure){org.slf4j.LoggerFactory.getLogger(PlataformaService.class).warn("Retenção SaaS interrompida tipo={}",failure.getClass().getSimpleName());}
    }
    private static AuthFailure limite() { return new AuthFailure(429,"LIMITE_TENTATIVAS","Muitas tentativas. Aguarde quinze minutos."); }
    private static String hashRefresh(String raw) { if(raw==null || !raw.matches("[A-Za-z0-9_-]{43}"))throw AuthFailure.invalid();return hash(raw); }
    private static String hash(String value) {
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException failure){throw new IllegalStateException("SHA-256 indisponível.",failure);}
    }
}
