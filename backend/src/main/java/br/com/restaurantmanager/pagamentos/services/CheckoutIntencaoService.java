package br.com.restaurantmanager.pagamentos.services;

import br.com.restaurantmanager.pagamentos.repositories.CheckoutRepository;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.UUID;

@Service
public class CheckoutIntencaoService {
    private final CheckoutRepository repository;
    private final ConexaoPagamentoService conexoes;
    private final int porta;

    public CheckoutIntencaoService(
            CheckoutRepository repository,
            ConexaoPagamentoService conexoes,
            @Value("${rm.pagamentos.porta-publica:443}") int porta) {
        this.repository = repository;
        this.conexoes = conexoes;
        this.porta = porta;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void preparar(UUID pedido, String valor, int prazo) {
        nova(pedido, pedido, valor, prazo);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void nova(UUID id, UUID pedido, String valor, int prazo) {
        String retorno =
                "https://"
                        + repository.hostRetorno()
                        + (porta == 443 ? "" : ":" + porta)
                        + "/pedidos?pagamento=retorno";
        repository.criar(
                id, pedido, conexoes.conexaoParaPedido(), valor, Instant.now(), retorno, prazo);
    }
}
