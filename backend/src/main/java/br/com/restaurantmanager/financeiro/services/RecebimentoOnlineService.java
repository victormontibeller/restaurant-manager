package br.com.restaurantmanager.financeiro.services;

import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.financeiro.repositories.CobrancaRepository;
import br.com.restaurantmanager.financeiro.repositories.MovimentoOnlineRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(propagation = Propagation.MANDATORY)
public class RecebimentoOnlineService {
    private final CobrancaRepository cobrancas;
    private final MovimentoOnlineRepository movimentos;
    private final EventoOperacionalService eventos;

    public RecebimentoOnlineService(
            CobrancaRepository cobrancas,
            MovimentoOnlineRepository movimentos,
            EventoOperacionalService eventos) {
        this.cobrancas = cobrancas;
        this.movimentos = movimentos;
        this.eventos = eventos;
    }

    public List<String> reembolsosConhecidos(UUID checkout) {
        return movimentos.reembolsosConhecidos(checkout);
    }

    public void confirmar(UUID pedido, UUID checkout, String transacao, BigDecimal valor) {
        UUID cobranca = cobrancas.localizar(pedido, null).orElseThrow();
        cobrancas.saldo(cobranca, true);
        movimentos.receber(cobranca, checkout, transacao, valor);
        reservar(cobranca);
    }

    public void reservar(UUID cobranca) {
        Object[] saldo = cobrancas.saldo(cobranca, true);
        BigDecimal excedente =
                ((BigDecimal) saldo[1])
                        .subtract((BigDecimal) saldo[2])
                        .subtract((BigDecimal) saldo[0])
                        .max(BigDecimal.ZERO);
        var criadas = movimentos.reservarExcedente(cobranca, excedente);
        if (!criadas.isEmpty()) {
            Object[] contexto = movimentos.contextoEvento(cobranca);
            for (UUID id : criadas)
                eventos.registrar(
                        (UUID) contexto[0],
                        "DEVOLUCAO_SOLICITADA",
                        (UUID) contexto[1],
                        null,
                        (UUID) contexto[2],
                        null,
                        id);
        }
    }
}
