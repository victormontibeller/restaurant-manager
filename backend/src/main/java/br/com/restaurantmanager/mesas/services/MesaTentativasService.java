package br.com.restaurantmanager.mesas.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.mesas.infrastructure.SegredosMesa;
import br.com.restaurantmanager.mesas.repositories.SessaoMesaRepository;
import java.time.Instant;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class MesaTentativasService {
    private final SessaoMesaRepository repository;

    public MesaTentativasService(SessaoMesaRepository repository) {
        this.repository = repository;
    }

    @Transactional(noRollbackFor = AuthFailure.class)
    public void contabilizar(UUID mesa, String origem) {
        Instant agora = Instant.now();
        if (repository.tentativa(SegredosMesa.hash("origem:" + origem), agora) > 30
                || repository.tentativa(SegredosMesa.hash("mesa:" + mesa + ":origem:" + origem), agora) > 5) {
            throw new AuthFailure(429, "LIMITE_TENTATIVAS", "Muitas tentativas. Aguarde quinze minutos.");
        }
    }
}
