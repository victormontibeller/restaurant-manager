package br.com.restaurantmanager.tenancy.services;

import br.com.restaurantmanager.tenancy.repositories.TenantRepository;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TenantService {
    private final TenantRepository repository;

    public TenantService(TenantRepository repository) {
        this.repository = repository;
    }

    public List<String> schemasParaManutencao(String depoisDe) {
        return repository.schemasParaManutencao(depoisDe);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void exigirNovasOperacoes() {
        String estado = repository.bloquearEstadoComercial(TenantScope.current())
                .orElseThrow(() -> new AuthFailure(404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado."));
        if (!estado.equals("ATIVO")) {
            throw new AuthFailure(409, "NOVAS_OPERACOES_BLOQUEADAS",
                    "Novos pedidos e atendimentos estão indisponíveis. Operações existentes continuam acessíveis.");
        }
    }
}
