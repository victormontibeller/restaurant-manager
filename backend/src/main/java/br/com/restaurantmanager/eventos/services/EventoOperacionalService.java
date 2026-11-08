package br.com.restaurantmanager.eventos.services;

import br.com.restaurantmanager.eventos.repositories.EventoOperacionalRepository;
import java.util.TreeMap;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventoOperacionalService {
    private final EventoOperacionalRepository repository;

    public EventoOperacionalService(EventoOperacionalRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void registrar(UUID unidade, String tipo, UUID pedido, UUID comanda, UUID usuario, UUID participante) {
        var fluxos = new TreeMap<String, Boolean>();
        fluxos.put("operacao:" + unidade, false);
        if (usuario != null) fluxos.put("cliente:" + unidade + ":" + usuario, false);
        if (participante != null) fluxos.put("participante:" + participante, false);
        if (comanda != null) fluxos.put("comanda:" + comanda, true);
        // Todos os escritores adquirem os fluxos na mesma ordem, depois dos agregados.
        fluxos.forEach((fluxo, compartilhado) -> repository.registrar(fluxo, unidade,
                compartilhado ? "COMANDA_ATUALIZADA" : tipo, compartilhado ? null : pedido, comanda));
    }
}
