package br.com.restaurantmanager.unidades;

import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UnidadeService {
    private final UnidadeRepository repository;
    public UnidadeService(UnidadeRepository repository) { this.repository = repository; }
    @Transactional(readOnly = true)
    public List<Resumo> listar() {
        return repository.findByAtivaTrueOrderByNome().stream()
                .map(u -> new Resumo(u.getId(), u.getNome(), u.getFuso())).toList();
    }
    public record Resumo(UUID id, String nome, String fuso) {}
}
