package br.com.restaurantmanager.identidade.services;

import br.com.restaurantmanager.identidade.repositories.ContatoClienteRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ContatoClienteService {
    private final ContatoClienteRepository repository;

    public ContatoClienteService(ContatoClienteRepository repository) {
        this.repository = repository;
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String email(UUID id) {
        if (id == null) return null;
        return repository.email(id);
    }
}
