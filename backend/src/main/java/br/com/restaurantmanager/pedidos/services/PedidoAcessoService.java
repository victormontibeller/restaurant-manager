package br.com.restaurantmanager.pedidos.services;

import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.mesas.services.ComandaService;
import br.com.restaurantmanager.mesas.services.MesaSessaoService;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.models.PedidoRegistro;
import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class PedidoAcessoService {
    private final PedidoRepository repository;
    private final AcessosService acessos;
    private final ComandaService comandas;
    private final MesaSessaoService sessoes;

    public PedidoAcessoService(PedidoRepository repository, AcessosService acessos,
            ComandaService comandas, MesaSessaoService sessoes) {
        this.repository = repository;
        this.acessos = acessos;
        this.comandas = comandas;
        this.sessoes = sessoes;
    }

    public PedidoRegistro obter(UUID id) {
        return repository.consultar(id, false).orElseThrow(ErrosPedido::inexistente);
    }

    public PedidoRegistro cliente(IdentidadeAtual ator, UUID id, boolean lock) {
        acessos.autorizarCliente(ator);
        PedidoRegistro pedido = obter(id);
        if (!"CLIENTE".equals(pedido.autoria()) || !ator.usuarioId().equals(pedido.usuarioId())) throw ErrosPedido.inexistente();
        pedido = bloquear(pedido, lock);
        acessos.autorizarCliente(ator);
        return pedido;
    }

    public PedidoRegistro participante(ParticipanteAtual ator, UUID id, boolean lock) {
        acessos.bloquearPoliticaOperacional();
        PedidoRegistro pedido = obter(id);
        if (ator == null || !ator.participanteId().equals(pedido.participanteId()) || !ator.comandaId().equals(pedido.comandaId())) {
            throw ErrosPedido.inexistente();
        }
        pedido = bloquear(pedido, lock);
        sessoes.validar(ator);
        return pedido;
    }

    public PedidoRegistro operacao(IdentidadeAtual ator, UUID id, Acao acao, boolean lock) {
        PedidoRegistro pedido = obter(id);
        acessos.autorizarOperacaoExistente(ator, acao, pedido.unidadeId());
        pedido = bloquear(pedido, lock);
        acessos.autorizarOperacaoExistente(ator, acao, pedido.unidadeId());
        return pedido;
    }

    private PedidoRegistro bloquear(PedidoRegistro pedido, boolean lock) {
        if (!lock) return pedido;
        if (pedido.comandaId() != null) comandas.bloquear(pedido.comandaId());
        return repository.consultar(pedido.id(), true).orElseThrow(ErrosPedido::inexistente);
    }
}
