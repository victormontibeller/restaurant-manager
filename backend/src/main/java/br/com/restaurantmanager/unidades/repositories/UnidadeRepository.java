package br.com.restaurantmanager.unidades.repositories;

import br.com.restaurantmanager.unidades.models.Unidade;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UnidadeRepository extends JpaRepository<Unidade, UUID> {
    public List<Unidade> findByAtivaTrueOrderByNome();
    public List<Unidade> findAllByOrderByNomeAscIdAsc(Pageable pagina);
}
