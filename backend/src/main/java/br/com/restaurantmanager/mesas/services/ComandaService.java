package br.com.restaurantmanager.mesas.services;

import br.com.restaurantmanager.mesas.dtos.ContextoComanda;
import br.com.restaurantmanager.mesas.exceptions.ErrosMesa;
import br.com.restaurantmanager.mesas.repositories.MesaRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ComandaService {
    private final MesaRepository repository;

    public ComandaService(MesaRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ContextoComanda consultar(UUID id) {
        var contexto = repository.comanda(id, false);
        if (contexto == null) throw ErrosMesa.inexistente();
        return contexto;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public ContextoComanda bloquear(UUID id) {
        var contexto = repository.comanda(id, true);
        if (contexto == null) throw ErrosMesa.inexistente();
        return contexto;
    }

    public void exigirAberta(ContextoComanda comanda) {
        if (!comanda.estado().equals("ABERTA")) {
            throw ErrosMesa.conflito("A comanda não aceita novas rodadas. Consulte o atendimento.");
        }
    }
}
