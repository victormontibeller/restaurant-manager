package br.com.restaurantmanager.financeiro.services;

import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.financeiro.dtos.ParcelaInicial;
import br.com.restaurantmanager.financeiro.dtos.SaldoCobranca;
import br.com.restaurantmanager.financeiro.repositories.CobrancaRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class CobrancaService {
    private final CobrancaRepository repository;
    private final RecebimentoOnlineService online;

    public CobrancaService(CobrancaRepository repository, RecebimentoOnlineService online) {
        this.repository = repository;
        this.online = online;
    }

    public void registrar(
            UUID unidade,
            UUID pedido,
            UUID comanda,
            List<ParcelaInicial> parcelas,
            BigDecimal taxa) {
        UUID cobranca = repository.obterOuCriar(unidade, pedido, comanda);
        repository.saldo(cobranca, true);
        for (ParcelaInicial parcela : parcelas) {
            repository.parcela(cobranca, pedido, parcela.unidadeComercialId(), parcela.valor());
        }
        if (taxa.signum() > 0) repository.parcela(cobranca, pedido, null, taxa);
    }

    public SaldoCobranca saldoPedido(UUID pedido, UUID comanda) {
        return repository
                .localizar(pedido, comanda)
                .map(id -> saldo(repository.saldo(id, false)))
                .orElseGet(this::zero);
    }

    public SaldoCobranca saldoComanda(UUID comanda) {
        return repository
                .localizar(null, comanda)
                .map(id -> saldo(repository.saldo(id, true)))
                .orElseGet(this::zero);
    }

    public void cancelar(
            UUID pedido,
            UUID comanda,
            List<UUID> unidades,
            boolean integral,
            UUID intencao,
            String motivo,
            Instant agora) {
        UUID cobranca = repository.localizar(pedido, comanda).orElseThrow();
        repository.saldo(cobranca, true);
        repository.cancelar(pedido, unidades, integral, intencao, motivo, agora);
        online.reservar(cobranca);
    }

    private SaldoCobranca saldo(Object[] valores) {
        BigDecimal devido = (BigDecimal) valores[0];
        BigDecimal pago = (BigDecimal) valores[1];
        BigDecimal devolvido = (BigDecimal) valores[2];
        BigDecimal liquido = pago.subtract(devolvido);
        return new SaldoCobranca(
                Dinheiro.texto(devido),
                Dinheiro.texto(pago),
                Dinheiro.texto(devolvido),
                Dinheiro.texto(devido.subtract(liquido).max(BigDecimal.ZERO)),
                Dinheiro.texto(liquido.subtract(devido).max(BigDecimal.ZERO)),
                (Boolean) valores[3]);
    }

    private SaldoCobranca zero() {
        return new SaldoCobranca("0.00", "0.00", "0.00", "0.00", "0.00", false);
    }
}
