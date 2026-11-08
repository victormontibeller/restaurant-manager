package br.com.restaurantmanager.mesas.services;

import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.identidade.config.JwtConfiguration;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.dtos.RefreshMesaPersistido;
import br.com.restaurantmanager.mesas.dtos.SessaoMesaPersistida;
import br.com.restaurantmanager.mesas.dtos.TokensMesa;
import br.com.restaurantmanager.mesas.infrastructure.SegredosMesa;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.mesas.repositories.MesaRepository;
import br.com.restaurantmanager.mesas.repositories.SessaoMesaRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

@Service
public class MesaSessaoService {
    public static final String AUDIENCE = "restaurant-manager-mesa";
    private final SessaoMesaRepository repository;
    private final MesaRepository mesas;
    private final ComandaService comandas;
    private final MesaTentativasService tentativas;
    private final JwtEncoder encoder;
    private final EventoOperacionalService eventos;
    private final TransactionTemplate transacao;
    private final AcessosService acessos;

    public MesaSessaoService(SessaoMesaRepository repository, MesaRepository mesas, ComandaService comandas,
            MesaTentativasService tentativas, JwtEncoder encoder, EventoOperacionalService eventos,
            PlatformTransactionManager manager, AcessosService acessos) {
        this.repository = repository;
        this.acessos = acessos;
        this.mesas = mesas;
        this.comandas = comandas;
        this.tentativas = tentativas;
        this.encoder = encoder;
        this.eventos = eventos;
        this.transacao = new TransactionTemplate(manager);
        this.transacao.setTimeout(10);
    }

    public TokensMesa autorizar(UUID mesa, String codigo, String origem) {
        // A quota confirma em transação própria antes de qualquer espera pelo atendimento.
        tentativas.contabilizar(mesa, origem);
        return transacao.execute(status -> {
            acessos.bloquearPoliticaOperacional();
            var referencia = mesas.codigo(mesa);
            if (referencia == null) throw AuthFailure.invalid();
            var comanda = comandas.bloquear(referencia.comandaId());
            var atual = mesas.codigo(mesa);
            Instant agora = Instant.now();
            String hash = SegredosMesa.hash(referencia.atendimentoId() + ":" + codigo);
            if (atual == null || !atual.atendimentoId().equals(referencia.atendimentoId())
                    || comanda.estado().equals("FECHADA") || !agora.isBefore(atual.expiraEm())
                    || !MessageDigest.isEqual(hash.getBytes(StandardCharsets.US_ASCII), atual.codigoHash().getBytes(StandardCharsets.US_ASCII))) {
                throw AuthFailure.invalid();
            }
            UUID participante = UUID.randomUUID();
            UUID sessao = UUID.randomUUID();
            repository.criar(participante, sessao, comanda.atendimentoId(), agora);
            mesas.auditar(participante, comanda.atendimentoId(), "PARTICIPANTE_AUTORIZADO", "INEXISTENTE", "ATIVO");
            eventos.registrar(comanda.unidadeId(), "PARTICIPANTE_AUTORIZADO", null, comanda.id(), null, participante);
            return emitir(repository.sessao(sessao, false), agora);
        });
    }

    @Transactional(noRollbackFor = AuthFailure.class)
    public TokensMesa refresh(String raw) {
        String hash = hashRefresh(raw);
        var refresh = localizar(hash);
        var referencia = repository.sessao(refresh.sessaoId(), false);
        if (referencia == null) throw AuthFailure.invalid();
        comandas.bloquear(referencia.comandaId());
        var sessao = repository.sessao(refresh.sessaoId(), true);
        refresh = localizar(hash);
        Instant agora = Instant.now();
        if (refresh.usadoEm() != null) {
            repository.revogar(refresh.sessaoId(), agora);
            throw AuthFailure.invalid();
        }
        if (sessao == null || !sessao.valida(agora)) throw AuthFailure.invalid();
        repository.consumirRefresh(hash, agora);
        return emitir(sessao, agora);
    }

    @Transactional
    public void logout(String raw) {
        var refresh = localizar(hashRefresh(raw));
        var sessao = repository.sessao(refresh.sessaoId(), false);
        if (sessao == null) throw AuthFailure.invalid();
        comandas.bloquear(sessao.comandaId());
        repository.sessao(sessao.sessaoId(), true);
        repository.revogar(sessao.sessaoId(), Instant.now());
    }

    @Transactional(readOnly = true)
    public ParticipanteAtual validar(Jwt jwt) {
        try {
            UUID empresa = SegredosMesa.empresa();
            if (!empresa.toString().equals(jwt.getClaimAsString("tenant"))) throw AuthFailure.invalid();
            var sessao = repository.sessao(UUID.fromString(jwt.getClaimAsString("sid")), false);
            if (sessao == null || !sessao.valida(Instant.now()) || !sessao.participanteId().toString().equals(jwt.getSubject())) {
                throw AuthFailure.invalid();
            }
            return principal(sessao, empresa);
        } catch (IllegalArgumentException | NullPointerException erro) {
            throw AuthFailure.invalid();
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void validar(ParticipanteAtual ator) {
        if (ator == null || !SegredosMesa.empresa().equals(ator.empresaId())) throw AuthFailure.invalid();
        var sessao = repository.sessao(ator.sessaoId(), false);
        if (sessao == null || !sessao.valida(Instant.now()) || !principal(sessao, ator.empresaId()).equals(ator)) {
            throw AuthFailure.invalid();
        }
    }

    private ParticipanteAtual principal(SessaoMesaPersistida sessao, UUID empresa) {
        return new ParticipanteAtual(sessao.participanteId(), sessao.sessaoId(), empresa, sessao.atendimentoId(), sessao.comandaId(), sessao.unidadeId());
    }

    private RefreshMesaPersistido localizar(String hash) {
        var refresh = repository.refresh(hash);
        if (refresh == null) throw AuthFailure.invalid();
        return refresh;
    }

    private String hashRefresh(String raw) {
        if (raw == null || !raw.matches("[A-Za-z0-9_-]{43}")) throw AuthFailure.invalid();
        return SegredosMesa.hash(raw);
    }

    private TokensMesa emitir(SessaoMesaPersistida sessao, Instant agora) {
        String refresh = SegredosMesa.refresh();
        repository.inserirRefresh(SegredosMesa.hash(refresh), sessao.sessaoId());
        Instant expira = agora.plusSeconds(300).isBefore(sessao.expiraEm()) ? agora.plusSeconds(300) : sessao.expiraEm();
        var claims = JwtClaimsSet.builder().issuer(JwtConfiguration.ISSUER).audience(List.of(AUDIENCE))
                .subject(sessao.participanteId().toString()).id(UUID.randomUUID().toString()).issuedAt(agora).expiresAt(expira)
                .claim("tenant", SegredosMesa.empresa().toString()).claim("sid", sessao.sessaoId().toString()).build();
        String access = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
        return new TokensMesa(access, refresh, Math.max(1, expira.getEpochSecond() - agora.getEpochSecond()));
    }
}
