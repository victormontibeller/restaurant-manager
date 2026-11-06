package br.com.restaurantmanager.unidades.services;

import br.com.restaurantmanager.unidades.dtos.ResumoUnidade;
import br.com.restaurantmanager.unidades.repositories.UnidadeRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UnidadeService {
    private final UnidadeRepository repository;

    public UnidadeService(UnidadeRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ResumoUnidade> listar() {
        return repository.findByAtivaTrueOrderByNome().stream()
                .map(u -> new ResumoUnidade(u.getId(), u.getNome(), u.getFuso())).toList();
    }

}
