package br.com.restaurantmanager.financeiro.services;

import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.financeiro.dtos.DevolucaoOnlineTrabalho;
import br.com.restaurantmanager.financeiro.repositories.CobrancaRepository;
import br.com.restaurantmanager.financeiro.repositories.DevolucaoOnlineRepository;
import br.com.restaurantmanager.pagamentos.dtos.ReembolsoProvedor;
import br.com.restaurantmanager.pagamentos.dtos.SituacaoProvedor;
import br.com.restaurantmanager.pagamentos.infrastructure.GatewayPagamento;
import br.com.restaurantmanager.pagamentos.services.CheckoutService;
import br.com.restaurantmanager.pagamentos.services.ConexaoPagamentoService;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.services.PedidoPagamentoService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.util.List;

@Service
public class DevolucaoOnlineService {
    private final DevolucaoOnlineRepository repository;
    private final CheckoutService consultas;
    private final ConexaoPagamentoService conexoes;
    private final PedidoPagamentoService pedidos;
    private final CobrancaRepository cobrancas;
    private final GatewayPagamento gateway;
    private final TransactionTemplate tx;
    private final EventoOperacionalService eventos;

    public DevolucaoOnlineService(
            DevolucaoOnlineRepository repository,
            CheckoutService consultas,
            ConexaoPagamentoService conexoes,
            PedidoPagamentoService pedidos,
            CobrancaRepository cobrancas,
            GatewayPagamento gateway,
            PlatformTransactionManager manager,
            EventoOperacionalService eventos) {
        this.repository = repository;
        this.consultas = consultas;
        this.conexoes = conexoes;
        this.pedidos = pedidos;
        this.cobrancas = cobrancas;
        this.gateway = gateway;
        this.eventos = eventos;
        tx = new TransactionTemplate(manager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.setTimeout(15);
    }

    public DevolucaoOnlineTrabalho reivindicar() {
        return tx.execute(s -> repository.reivindicar());
    }

    public void processar(DevolucaoOnlineTrabalho d) {
        var checkout = tx.execute(s -> consultas.consultarSistema(d.checkoutId(), false));
        var credencial = conexoes.credencial(checkout.conexaoId());
        var situacao = gateway.consultar(credencial, checkout.externoId());
        consultas.validar(checkout, credencial, situacao);
        var conhecidos = tx.execute(s -> repository.conhecidos(checkout.id()));
        var candidatos = candidatos(d, situacao, conhecidos);
        if (candidatos.isEmpty()) {
            boolean desconhecido =
                    situacao.reembolsos().stream().anyMatch(r -> !conhecidos.contains(r.id()));
            if (desconhecido)
                throw ErrosPedido.conflito(
                        "Há devolução externa ainda sem vínculo. Reconcilie antes de repetir.");
            gateway.devolver(credencial, checkout.externoId(), d.transacao(), d.valor(), d.id());
            situacao = gateway.consultar(credencial, checkout.externoId());
            consultas.validar(checkout, credencial, situacao);
            candidatos = candidatos(d, situacao, conhecidos);
        }
        if (candidatos.size() != 1)
            throw ErrosPedido.conflito(
                    "A devolução ainda não tem confirmação inequívoca no provedor.");
        String externo = candidatos.getFirst().id();
        tx.executeWithoutResult(
                s -> {
                    var pedido = pedidos.sistema(d.pedidoId());
                    cobrancas.saldo(d.cobrancaId(), true);
                    consultas.consultarSistema(d.checkoutId(), true);
                    if (repository.confirmar(d, externo))
                        eventos.registrar(
                                pedido.unidadeId(),
                                "DEVOLUCAO_CONFIRMADA",
                                pedido.id(),
                                null,
                                pedido.usuarioId(),
                                null,
                                d.id());
                    consultas.reconciliarSistema(d.checkoutId());
                });
    }

    public void falhar(DevolucaoOnlineTrabalho d, RuntimeException erro) {
        tx.executeWithoutResult(
                s -> {
                    var pedido = pedidos.sistema(d.pedidoId());
                    if (repository.falhar(d, erro.getClass().getSimpleName()))
                        eventos.registrar(
                                pedido.unidadeId(),
                                "DEVOLUCAO_FALHOU",
                                pedido.id(),
                                null,
                                pedido.usuarioId(),
                                null,
                                d.id());
                });
    }

    private List<ReembolsoProvedor> candidatos(
            DevolucaoOnlineTrabalho d, SituacaoProvedor r, List<String> conhecidos) {
        return r.reembolsos().stream()
                .filter(
                        p ->
                                d.transacao().equals(p.transacaoId())
                                        && p.id() != null
                                        && !conhecidos.contains(p.id())
                                        && new BigDecimal(p.valor())
                                                        .compareTo(new BigDecimal(d.valor()))
                                                == 0
                                        && List.of("processed", "approved", "refunded")
                                                .contains(p.estado() == null ? "" : p.estado()))
                .toList();
    }
}
