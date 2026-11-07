package br.com.restaurantmanager.identidade.services;

import br.com.restaurantmanager.identidade.dtos.ResultadoRetencao;
import br.com.restaurantmanager.identidade.repositories.RetencaoIdentidadeRepository;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RetencaoIdentidadeService {
    private final RetencaoIdentidadeRepository repository;

    public RetencaoIdentidadeService(RetencaoIdentidadeRepository repository) {
        this.repository = repository;
    }

    @Transactional(timeout = 10)
    public ResultadoRetencao executarLote() {
        if (!TenantScope.current().matches("t_[a-f0-9]{32}")) {
            throw new IllegalStateException("Contexto empresarial obrigatório.");
        }
        // A validade absoluta não se estende com refresh. Preservar todos os hashes
        // da família até um dia após expiração, inclusive os consumidos/revogados.
        Instant limite = Instant.now().minusSeconds(86400);
        return new ResultadoRetencao(repository.expurgarSessoes(limite), repository.expurgarLimites(limite));
    }
}
