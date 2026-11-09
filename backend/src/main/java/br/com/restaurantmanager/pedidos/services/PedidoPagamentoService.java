package br.com.restaurantmanager.pedidos.services;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.pedidos.models.PedidoRegistro;
import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.util.UUID;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class PedidoPagamentoService {
    private final PedidoRepository repository;
    private final PedidoAcessoService acesso;
    private final AcessosService acessos;
    private final PedidoFluxoService fluxo;
    private final PedidoDeadlineService deadlines;
    private final Clock clock;

    public PedidoPagamentoService(
            PedidoRepository repository,
            PedidoAcessoService acesso,
            AcessosService acessos,
            PedidoFluxoService fluxo,
            PedidoDeadlineService deadlines,
            @Qualifier("pedidosClock") Clock clock) {
        this.repository = repository;
        this.acesso = acesso;
        this.acessos = acessos;
        this.fluxo = fluxo;
        this.deadlines = deadlines;
        this.clock = clock;
    }

    public PedidoRegistro cliente(IdentidadeAtual ator, UUID pedido, boolean lock) {
        return acesso.cliente(ator, pedido, lock);
    }

    public PedidoRegistro sistema(UUID id) {
        acessos.bloquearPoliticaOperacional();
        var pedido = repository.consultar(id, true).orElseThrow(ErrosPedido::inexistente);
        if (!pedido.pagoOnline() || pedido.comandaId() != null)
            throw ErrosPedido.conflito("Pedido sem pagamento online independente.");
        if (fluxo.expirarSeNecessario(pedido, clock.instant()))
            return repository.consultar(id, true).orElseThrow();
        return pedido;
    }

    public void confirmar(PedidoRegistro pedido) {
        if (pedido.estado() != EstadoPedido.AGUARDANDO_PAGAMENTO) return;
        var agora = clock.instant();
        if (fluxo.expirarSeNecessario(pedido, agora)) return;
        repository.iniciarAceitePago(pedido, agora);
        fluxo.alterar(
                pedido,
                EstadoPedido.AGUARDANDO_ACEITE,
                null,
                null,
                "PAGAMENTO_CONFIRMADO",
                "Pagamento confirmado por consulta confiável ao provedor.",
                agora);
        deadlines.agendar(pedido.id(), agora.plusSeconds(pedido.alertaSegundos()));
    }
}
