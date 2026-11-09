package br.com.restaurantmanager.unidades.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.unidades.dtos.ResumoUnidade;
import br.com.restaurantmanager.unidades.repositories.UnidadeRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class UnidadeService {
    private final UnidadeRepository repository;

    public UnidadeService(UnidadeRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public List<ResumoUnidade> listar() {
        return repository.findByAtivaTrueOrderByNome().stream()
                .map(u -> new ResumoUnidade(u.getId(), u.getNome(), u.getFuso()))
                .toList();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public String fusoOperacional(UUID id) {
        return repository
                .findById(id)
                .orElseThrow(
                        () ->
                                new AuthFailure(
                                        404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado."))
                .getFuso();
    }
}
