package br.com.restaurantmanager.pedidos.services;

import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.financeiro.services.CobrancaService;
import br.com.restaurantmanager.pedidos.dtos.UnidadeProducao;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.pedidos.models.EstadoProducao;
import br.com.restaurantmanager.pedidos.models.PedidoRegistro;
import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class PedidoFluxoService {
    private final PedidoRepository repository;
    private final CobrancaService cobrancas;
    private final EventoOperacionalService eventos;

    public PedidoFluxoService(PedidoRepository repository, CobrancaService cobrancas, EventoOperacionalService eventos) {
        this.repository = repository;
        this.cobrancas = cobrancas;
        this.eventos = eventos;
    }

    public boolean expirarSeNecessario(PedidoRegistro pedido, Instant agora) {
        if (pedido.estado() != EstadoPedido.AGUARDANDO_ACEITE || agora.isBefore(pedido.expirarEm())) return false;
        alertar(pedido, agora);
        cancelar(pedido, List.of(), pedido.id(), null, "Prazo de aceite expirado.", agora, "PEDIDO_EXPIRADO");
        return true;
    }

    public void cancelar(PedidoRegistro pedido, List<UUID> selecionadas, UUID intencao, UUID ator,
            String motivo, Instant agora, String evento) {
        if (pedido.estado() == EstadoPedido.CANCELADO || pedido.estado() == EstadoPedido.CONCLUIDO) {
            throw ErrosPedido.conflito("Pedido já está encerrado.");
        }
        var ativas = repository.unidades(pedido.id()).stream().filter(u -> u.estado() != EstadoProducao.CANCELADO).toList();
        List<UUID> ids = selecionadas.isEmpty() ? ativas.stream().map(UnidadeProducao::id).toList() : selecionadas;
        if (ids.isEmpty() || ids.stream().distinct().count() != ids.size()
                || ids.stream().anyMatch(id -> ativas.stream().noneMatch(u -> u.id().equals(id)))) {
            throw ErrosPedido.conflito("Selecione unidades comerciais ativas deste pedido. Componentes de combo não podem ser cancelados separadamente.");
        }
        ids.stream().sorted().forEach(id -> repository.alterarUnidade(id, EstadoProducao.CANCELADO, agora));
        boolean integral = ids.size() == ativas.size();
        cobrancas.cancelar(pedido.id(), pedido.comandaId(), ids, integral, intencao, motivo, agora);
        EstadoPedido estado = integral ? EstadoPedido.CANCELADO
                : pedido.estado() == EstadoPedido.AGUARDANDO_ACEITE ? EstadoPedido.AGUARDANDO_ACEITE : agregado(pedido, false);
        alterar(pedido, estado, null, ator, evento, motivo, agora);
        if (integral) resolverSolicitacoesAtendidas(pedido, ator, agora);
    }

    private void resolverSolicitacoesAtendidas(PedidoRegistro pedido, UUID ator, Instant agora) {
        repository.solicitacoes(pedido.id()).stream().filter(s -> s.estado().equals("PENDENTE")).forEach(solicitacao -> {
            repository.decidir(solicitacao.id(), true, agora);
            repository.historico(pedido.id(), ator, "CANCELAMENTO_APROVADO",
                    "Solicitação atendida pelo cancelamento integral.", agora);
            eventos.registrar(pedido.unidadeId(), "CANCELAMENTO_APROVADO", pedido.id(), pedido.comandaId(),
                    pedido.usuarioId(), pedido.participanteId());
        });
    }

    public EstadoPedido agregado(PedidoRegistro pedido, boolean iniciouAgora) {
        var ativas = repository.unidades(pedido.id()).stream().filter(u -> u.estado() != EstadoProducao.CANCELADO).toList();
        if (ativas.isEmpty()) return EstadoPedido.CANCELADO;
        if (ativas.stream().allMatch(u -> u.estado() == EstadoProducao.PRONTO)) return EstadoPedido.PRONTO;
        return iniciouAgora || pedido.primeiroPreparoEm() != null ? EstadoPedido.EM_PREPARO : EstadoPedido.NA_FILA;
    }

    public void alterar(PedidoRegistro pedido, EstadoPedido estado, Instant primeiro, UUID ator,
            String tipo, String motivo, Instant agora) {
        repository.alterarEstado(pedido.id(), estado, primeiro);
        repository.historico(pedido.id(), ator, tipo, motivo, agora);
        eventos.registrar(pedido.unidadeId(), tipo, pedido.id(), pedido.comandaId(), pedido.usuarioId(), pedido.participanteId());
    }

    public void alertar(PedidoRegistro pedido, Instant agora) {
        if (pedido.estado() != EstadoPedido.AGUARDANDO_ACEITE || pedido.alertado() || agora.isBefore(pedido.alertarEm())) return;
        repository.marcarAlerta(pedido.id());
        repository.historico(pedido.id(), null, "ACEITE_ATRASADO", "Pedido aguarda aceite da equipe.", agora);
        eventos.registrar(pedido.unidadeId(), "ACEITE_ATRASADO", pedido.id(), null, pedido.usuarioId(), null);
    }
}
