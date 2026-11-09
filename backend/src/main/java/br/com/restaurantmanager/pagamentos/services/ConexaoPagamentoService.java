package br.com.restaurantmanager.pagamentos.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.pagamentos.dtos.AutorizacaoPagamento;
import br.com.restaurantmanager.pagamentos.dtos.ConexaoRegistro;
import br.com.restaurantmanager.pagamentos.dtos.CredencialPagamento;
import br.com.restaurantmanager.pagamentos.dtos.OAuthRegistro;
import br.com.restaurantmanager.pagamentos.dtos.StatusConexao;
import br.com.restaurantmanager.pagamentos.infrastructure.GatewayPagamento;
import br.com.restaurantmanager.pagamentos.infrastructure.ProtecaoPagamento;
import br.com.restaurantmanager.pagamentos.infrastructure.SegredosPagamento;
import br.com.restaurantmanager.pagamentos.repositories.ConexaoPagamentoRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import tools.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.Base64;
import java.util.UUID;

@Service
public class ConexaoPagamentoService {
    private final ConexaoPagamentoRepository repository;
    private final AcessosService acessos;
    private final ProtecaoPagamento protecao;
    private final GatewayPagamento gateway;
    private final ObjectMapper mapper;
    private final TransactionTemplate tx;
    private final int porta;

    public ConexaoPagamentoService(
            ConexaoPagamentoRepository repository,
            AcessosService acessos,
            ProtecaoPagamento protecao,
            GatewayPagamento gateway,
            ObjectMapper mapper,
            PlatformTransactionManager manager,
            @Value("${rm.pagamentos.porta-publica:443}") int porta) {
        this.repository = repository;
        this.acessos = acessos;
        this.protecao = protecao;
        this.gateway = gateway;
        this.mapper = mapper;
        this.porta = porta;
        this.tx = new TransactionTemplate(manager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.setTimeout(15);
    }

    @Transactional
    public StatusConexao consultar(IdentidadeAtual ator) {
        acessos.autorizarAdministrador(ator, false);
        return repository
                .ativa()
                .map(c -> new StatusConexao(c.id(), c.vendedor(), c.reautorizar(), c.expiraEm()))
                .orElse(null);
    }

    @Transactional
    public AutorizacaoPagamento iniciar(IdentidadeAtual ator, String host) {
        acessos.autorizarAdministrador(ator, true);
        protecao.exigirConfiguracao();
        if (!host.matches("[a-zA-Z0-9.-]{1,253}"))
            throw new IllegalStateException("Origem de integração inválida.");
        String retorno =
                "https://"
                        + host
                        + (porta == 443 ? "" : ":" + porta)
                        + "/api/v1/integracoes/mercadopago/retorno";
        UUID id = UUID.randomUUID();
        String state = SegredosPagamento.refresh();
        String verificador = SegredosPagamento.refresh();
        String url = gateway.autorizacao(state, desafio(verificador), retorno);
        repository.iniciar(
                id,
                SegredosPagamento.hash(state),
                protecao.cifrar(id, verificador),
                retorno,
                ator.usuarioId(),
                ator.sessaoId());
        acessos.auditarConfiguracao(
                ator, null, "MERCADOPAGO_AUTORIZACAO_INICIADA", "", id.toString());
        return new AutorizacaoPagamento(url);
    }

    public void concluir(String state, String code) {
        if (state == null || state.length() > 200 || code == null || code.length() > 1000)
            throw indisponivel();
        OAuthRegistro trabalho =
                tx.execute(
                        status -> {
                            var r = repository.oauth(SegredosPagamento.hash(state));
                            if (!r.estado().equals("CRIADO")
                                    || !Instant.now().isBefore(r.expiraEm())) throw indisponivel();
                            acessos.autorizarAdministrador(ator(r), true);
                            repository.estadoOAuth(r.id(), "PROCESSANDO");
                            return r;
                        });
        try {
            CredencialPagamento credencial =
                    gateway.autorizar(
                            code,
                            protecao.decifrar(trabalho.id(), trabalho.verificador()),
                            trabalho.retorno());
            tx.executeWithoutResult(
                    status -> {
                        var atual = repository.oauth(SegredosPagamento.hash(state));
                        if (!atual.estado().equals("PROCESSANDO")) throw indisponivel();
                        acessos.autorizarAdministrador(ator(atual), true);
                        UUID id =
                                repository
                                        .idParaVendedor(credencial.vendedor())
                                        .orElseGet(UUID::randomUUID);
                        repository.autorizar(
                                id,
                                credencial.vendedor(),
                                protecao.cifrar(id, mapper.writeValueAsString(credencial)),
                                credencial.expiraEm());
                        repository.estadoOAuth(atual.id(), "CONCLUIDO");
                        acessos.auditarConfiguracao(
                                ator(atual), null, "MERCADOPAGO_CONECTADO", "", id.toString());
                    });
        } catch (RuntimeException erro) {
            tx.executeWithoutResult(status -> repository.estadoOAuth(trabalho.id(), "REAUTORIZAR"));
            throw indisponivel();
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public UUID conexaoParaPedido() {
        return repository
                .ativa()
                .filter(c -> !c.reautorizar())
                .map(ConexaoRegistro::id)
                .orElseThrow(ConexaoPagamentoService::indisponivel);
    }

    public CredencialPagamento credencial(UUID id) {
        UUID lease = UUID.randomUUID();
        ConexaoRegistro c =
                tx.execute(
                        status -> {
                            var atual = repository.obter(id, true);
                            if (atual.reautorizar()) throw indisponivel();
                            if (atual.leaseId() != null) {
                                if (Instant.now().isBefore(atual.leaseAte())) throw indisponivel();
                                repository.falhar(id, atual.leaseId());
                                return null;
                            }
                            if (atual.expiraEm().isBefore(Instant.now().plusSeconds(60)))
                                repository.lease(id, lease);
                            return repository.obter(id, false);
                        });
        if (c == null) throw indisponivel();
        var credencial =
                mapper.readValue(protecao.decifrar(id, c.credencial()), CredencialPagamento.class);
        if (!lease.equals(c.leaseId())) return credencial;
        try {
            var nova = gateway.renovar(credencial);
            if (!nova.vendedor().equals(c.vendedor())) throw indisponivel();
            tx.executeWithoutResult(
                    status ->
                            repository.renovar(
                                    id,
                                    lease,
                                    protecao.cifrar(id, mapper.writeValueAsString(nova)),
                                    nova.expiraEm()));
            return nova;
        } catch (RuntimeException erro) {
            tx.executeWithoutResult(status -> repository.falhar(id, lease));
            throw indisponivel();
        }
    }

    private IdentidadeAtual ator(OAuthRegistro r) {
        return new IdentidadeAtual(
                r.atorId(), r.sessaoId(), SegredosPagamento.empresa(), "ADMINISTRADOR", true);
    }

    private static String desafio(String valor) {
        try {
            return Base64.getUrlEncoder()
                    .withoutPadding()
                    .encodeToString(
                            MessageDigest.getInstance("SHA-256")
                                    .digest(valor.getBytes(StandardCharsets.US_ASCII)));
        } catch (NoSuchAlgorithmException erro) {
            throw new IllegalStateException("SHA-256 indisponível.", erro);
        }
    }

    private static AuthFailure indisponivel() {
        return new AuthFailure(
                503,
                "CONEXAO_PAGAMENTO_INDISPONIVEL",
                "A conexão Mercado Pago precisa de autorização ou reconciliação. Consulte a"
                    + " integração.");
    }
}
