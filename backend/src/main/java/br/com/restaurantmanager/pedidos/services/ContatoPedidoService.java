package br.com.restaurantmanager.pedidos.services;

import br.com.restaurantmanager.pedidos.dtos.ContatoPedido;
import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ContatoPedidoService {
    private final PedidoRepository repository;

    public ContatoPedidoService(PedidoRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ContatoPedido consultar(UUID id) {
        var pedido = repository.consultar(id, false).orElseThrow();
        return new ContatoPedido(
                pedido.autoria().equals("CLIENTE") ? pedido.usuarioId() : null,
                pedido.versao(),
                pedido.estado().name(),
                pedido.canal().name());
    }
}
