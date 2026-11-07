package br.com.restaurantmanager.tenancy.services;

import br.com.restaurantmanager.tenancy.repositories.TenantRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class TenantService {
    private final TenantRepository repository;

    public TenantService(TenantRepository repository) {
        this.repository = repository;
    }

    public List<String> schemasParaManutencao(String depoisDe) {
        return repository.schemasParaManutencao(depoisDe);
    }
}
