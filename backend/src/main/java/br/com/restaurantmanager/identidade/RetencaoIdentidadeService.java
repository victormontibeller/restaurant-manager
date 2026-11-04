package br.com.restaurantmanager.identidade;

import br.com.restaurantmanager.tenancy.TenantScope;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RetencaoIdentidadeService {
    private final RetencaoIdentidadeRepository repository;
    public RetencaoIdentidadeService(RetencaoIdentidadeRepository repository) { this.repository = repository; }
    public record Resultado(int sessoes, int limites) {}
    @Transactional(timeout = 10)
    public Resultado executarLote() {
        if (!TenantScope.current().matches("t_[a-f0-9]{32}")) throw new IllegalStateException("Contexto empresarial obrigatório.");
        // A validade absoluta não se estende com refresh. Preservar todos os hashes
        // da família até um dia após expiração, inclusive os consumidos/revogados.
        Instant limite = Instant.now().minusSeconds(86400);
        return new Resultado(repository.expurgarSessoes(limite), repository.expurgarLimites(limite));
    }
}
