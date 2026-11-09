package br.com.restaurantmanager.pedidos.services;

import br.com.restaurantmanager.pedidos.dtos.TrabalhoDeadline;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.pedidos.repositories.PedidoDeadlineRepository;
import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;

@Service
public class PedidoDeadlineService {
    private final PedidoRepository repository;
    private final PedidoDeadlineRepository trabalhos;
    private final PedidoFluxoService fluxo;
    private final Clock clock;

    public PedidoDeadlineService(
            PedidoRepository repository,
            PedidoDeadlineRepository trabalhos,
            PedidoFluxoService fluxo,
            @Qualifier("pedidosClock") Clock clock) {
        this.repository = repository;
        this.trabalhos = trabalhos;
        this.fluxo = fluxo;
        this.clock = clock;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void agendar(UUID pedido, Instant alerta) {
        trabalhos.agendar(pedido, alerta);
    }

    @Transactional(timeout = 10)
    public TrabalhoDeadline reivindicar() {
        return trabalhos.reivindicar(clock.instant()).orElse(null);
    }

    @Transactional(timeout = 10)
    public void processar(TrabalhoDeadline trabalho) {
        Instant agora = clock.instant();
        var pedido = repository.consultar(trabalho.pedidoId(), true).orElse(null);
        if (!trabalhos.possuiLease(trabalho, agora)) return;
        if (pedido == null
                || (pedido.estado() != EstadoPedido.AGUARDANDO_ACEITE
                        && pedido.estado() != EstadoPedido.AGUARDANDO_PAGAMENTO)) {
            trabalhos.concluir(trabalho, null);
            return;
        }
        agora = clock.instant();
        if (fluxo.expirarSeNecessario(pedido, agora)) trabalhos.concluir(trabalho, null);
        else {
            fluxo.alertar(pedido, agora);
            trabalhos.concluir(
                    trabalho,
                    pedido.estado() == EstadoPedido.AGUARDANDO_PAGAMENTO
                            ? pedido.pagamentoExpiraEm()
                            : pedido.expirarEm());
        }
    }

    @Transactional(timeout = 10)
    public void falhar(TrabalhoDeadline trabalho, String tipo) {
        String sanitizado = tipo.replaceAll("[^A-Za-z0-9]", "");
        trabalhos.falhar(
                trabalho,
                clock.instant(),
                sanitizado.substring(0, Math.min(100, sanitizado.length())));
    }
}
