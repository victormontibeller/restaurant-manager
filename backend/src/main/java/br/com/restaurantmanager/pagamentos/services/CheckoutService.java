package br.com.restaurantmanager.pagamentos.services;

import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.financeiro.services.CobrancaService;
import br.com.restaurantmanager.financeiro.services.RecebimentoOnlineService;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pagamentos.dtos.CheckoutRegistro;
import br.com.restaurantmanager.pagamentos.dtos.CheckoutResumo;
import br.com.restaurantmanager.pagamentos.dtos.CredencialPagamento;
import br.com.restaurantmanager.pagamentos.dtos.SituacaoProvedor;
import br.com.restaurantmanager.pagamentos.infrastructure.GatewayPagamento;
import br.com.restaurantmanager.pagamentos.infrastructure.SegredosPagamento;
import br.com.restaurantmanager.pagamentos.repositories.CheckoutRepository;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.pedidos.services.PedidoPagamentoService;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
public class CheckoutService {
    private final CheckoutRepository repository;
    private final ConexaoPagamentoService conexoes;
    private final GatewayPagamento gateway;
    private final PedidoPagamentoService pedidos;
    private final RecebimentoOnlineService recebimentos;
    private final CobrancaService cobrancas;
    private final TransactionTemplate tx;
    private final boolean teste;
    private final CheckoutIntencaoService intencoes;
    private final EventoOperacionalService eventos;

    public CheckoutService(
            CheckoutRepository repository,
            ConexaoPagamentoService conexoes,
            GatewayPagamento gateway,
            PedidoPagamentoService pedidos,
            RecebimentoOnlineService recebimentos,
            CobrancaService cobrancas,
            PlatformTransactionManager manager,
            CheckoutIntencaoService intencoes,
            EventoOperacionalService eventos,
            @Value("${rm.pagamentos.test-base-url:}") String testBase,
            @Value("${rm.stage:dev}") String stage) {
        this.repository = repository;
        this.conexoes = conexoes;
        this.gateway = gateway;
        this.pedidos = pedidos;
        this.recebimentos = recebimentos;
        this.cobrancas = cobrancas;
        this.intencoes = intencoes;
        this.eventos = eventos;
        this.teste = stage.equals("test") && !testBase.isBlank();
        this.tx = new TransactionTemplate(manager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.setTimeout(15);
    }

    @Transactional
    public List<CheckoutResumo> listar(IdentidadeAtual ator, UUID pedido) {
        pedidos.cliente(ator, pedido, false);
        return repository.listar(pedido);
    }

    @Transactional
    public List<CheckoutResumo> novaTentativa(IdentidadeAtual ator, UUID pedido, UUID intencao) {
        var p = pedidos.cliente(ator, pedido, true);
        var anteriores = repository.listar(pedido);
        if (anteriores.stream().anyMatch(c -> c.id().equals(intencao))) return anteriores;
        if (p.estado() != EstadoPedido.AGUARDANDO_PAGAMENTO
                || !Instant.now().isBefore(p.pagamentoExpiraEm())
                || anteriores.stream().anyMatch(c -> !c.estado().equals("RECUSADO")))
            throw ErrosPedido.conflito(
                    "A tentativa anterior precisa ser resolvida antes de outro checkout.");
        intencoes.nova(
                intencao,
                pedido,
                cobrancas.saldoPedido(pedido, null).saldoAReceber(),
                (int)
                        Math.max(
                                1,
                                Duration.between(Instant.now(), p.pagamentoExpiraEm())
                                        .getSeconds()));
        return repository.listar(pedido);
    }

    public CheckoutRegistro reivindicar() {
        return tx.execute(s -> repository.reivindicar());
    }

    public void processar(CheckoutRegistro trabalho) {
        CredencialPagamento credencial = conexoes.credencial(trabalho.conexaoId());
        SituacaoProvedor situacao;
        if (trabalho.externoId() == null) {
            var anteriores = gateway.buscar(credencial, trabalho.id(), trabalho.criadoEm());
            if (anteriores.size() > 1)
                throw ErrosPedido.conflito(
                        "Mais de uma cobrança encontrada para a mesma intenção.");
            var pedido = tx.execute(s -> pedidos.sistema(trabalho.pedidoId()));
            if (anteriores.isEmpty() && pedido.estado() == EstadoPedido.CANCELADO) {
                if (trabalho.enviado())
                    throw ErrosPedido.conflito(
                            "Cobrança incerta de pedido cancelado exige reconciliação.");
                tx.executeWithoutResult(s -> repository.concluir(trabalho, null, null, "RECUSADO"));
                return;
            }
            if (trabalho.prazoSegundos() == null || trabalho.retornoUrl() == null)
                throw ErrosPedido.conflito(
                        "A intenção financeira precisa de revisão do snapshot antes de criar"
                                + " cobrança.");
            if (anteriores.isEmpty())
                tx.executeWithoutResult(s -> repository.marcarEnviado(trabalho));
            situacao =
                    anteriores.isEmpty()
                            ? gateway.criar(
                                    credencial,
                                    trabalho.id(),
                                    trabalho.valor(),
                                    trabalho.prazoSegundos(),
                                    trabalho.retornoUrl())
                            : anteriores.getFirst();
        } else situacao = gateway.consultar(credencial, trabalho.externoId());
        validar(trabalho, credencial, situacao);
        var atual = tx.execute(s -> pedidos.sistema(trabalho.pedidoId()));
        if (atual.estado() == EstadoPedido.CANCELADO && "created".equals(situacao.estado())) {
            gateway.cancelar(
                    credencial,
                    situacao.id(),
                    UUID.nameUUIDFromBytes(
                            ("cancelar:" + trabalho.id()).getBytes(StandardCharsets.UTF_8)));
            situacao = gateway.consultar(credencial, situacao.id());
            validar(trabalho, credencial, situacao);
        }
        SituacaoProvedor confirmado = situacao;
        tx.executeWithoutResult(
                s -> {
                    var pedido = pedidos.sistema(trabalho.pedidoId());
                    var anterior = repository.obter(trabalho.id(), true);
                    if (!repository.possuiLease(trabalho)) return;
                    repository.mapear(confirmado.id(), SegredosPagamento.empresa());
                    BigDecimal total = BigDecimal.ZERO;
                    var ids = new HashSet<String>();
                    for (var p : confirmado.pagamentos()) {
                        if (!List.of("processed", "refunded")
                                .contains(p.estado() == null ? "" : p.estado())) continue;
                        if (p.id() == null
                                || !p.id().matches("[A-Za-z0-9_-]{1,100}")
                                || !ids.add(p.id()))
                            throw ErrosPedido.conflito("Transação financeira inválida.");
                        BigDecimal valor = Dinheiro.ler(p.valor());
                        if (valor.signum() <= 0)
                            throw ErrosPedido.conflito("Valor confirmado inválido.");
                        total = total.add(valor);
                    }
                    if (total.compareTo(new BigDecimal(trabalho.valor())) > 0)
                        throw ErrosPedido.conflito("Valor recebido diverge da intenção.");
                    for (var p : confirmado.pagamentos()) {
                        if (ids.contains(p.id()))
                            recebimentos.confirmar(
                                    pedido.id(), trabalho.id(), p.id(), Dinheiro.ler(p.valor()));
                    }
                    boolean pago = total.compareTo(new BigDecimal(trabalho.valor())) == 0;
                    String estado =
                            pago
                                    ? "CONFIRMADO"
                                    : List.of("failed", "canceled", "expired")
                                                    .contains(
                                                            confirmado.estado() == null
                                                                    ? ""
                                                                    : confirmado.estado())
                                            ? "RECUSADO"
                                            : "AGUARDANDO";
                    var conhecidos = recebimentos.reembolsosConhecidos(trabalho.id());
                    boolean devolucaoSemVinculo =
                            confirmado.reembolsos().stream()
                                    .anyMatch(r -> !conhecidos.contains(r.id()));
                    String finalizado = devolucaoSemVinculo ? "BLOQUEADO" : estado;
                    repository.concluir(
                            trabalho, confirmado.id(), confirmado.checkoutUrl(), finalizado);
                    if (!anterior.estado().equals(finalizado))
                        eventos.registrar(
                                pedido.unidadeId(),
                                "CHECKOUT_ATUALIZADO",
                                pedido.id(),
                                null,
                                pedido.usuarioId(),
                                null);
                    if (pago
                            && !devolucaoSemVinculo
                            && new BigDecimal(
                                                    cobrancas
                                                            .saldoPedido(pedido.id(), null)
                                                            .saldoAReceber())
                                            .signum()
                                    == 0) pedidos.confirmar(pedido);
                });
    }

    public void falhar(CheckoutRegistro trabalho, RuntimeException erro) {
        tx.executeWithoutResult(s -> repository.falhar(trabalho, erro.getClass().getSimpleName()));
    }

    public void validar(CheckoutRegistro trabalho, CredencialPagamento c, SituacaoProvedor r) {
        if (r.id() == null
                || !r.id().matches("[A-Za-z0-9_-]{1,100}")
                || !c.vendedor().equals(r.vendedor())
                || !trabalho.id().toString().equals(r.referencia())
                || !"BRL".equals(r.moeda())
                || new BigDecimal(trabalho.valor()).compareTo(Dinheiro.ler(r.valor())) != 0
                || (trabalho.externoId() != null && !trabalho.externoId().equals(r.id())))
            throw ErrosPedido.conflito(
                    "A situação do provedor não corresponde à cobrança esperada.");
        if (r.checkoutUrl() != null) {
            URI uri = URI.create(r.checkoutUrl());
            boolean oficial =
                    "https".equals(uri.getScheme())
                            && List.of(
                                            "www.mercadopago.com.br",
                                            "www.mercadopago.com",
                                            "www.mercadopago.com.ar")
                                    .contains(uri.getHost());
            boolean local =
                    teste && "http".equals(uri.getScheme()) && "127.0.0.1".equals(uri.getHost());
            if ((!oficial && !local) || uri.getUserInfo() != null)
                throw ErrosPedido.conflito("Endereço de checkout inválido.");
        }
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public CheckoutRegistro consultarSistema(UUID id, boolean lock) {
        return repository.obter(id, lock);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void reconciliarSistema(UUID id) {
        repository.reconciliar(id);
    }
}
