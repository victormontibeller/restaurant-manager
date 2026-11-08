package br.com.restaurantmanager.identidade.repositories;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceException;
import java.lang.reflect.Proxy;
import java.sql.SQLException;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class AcessosRepositoryTest {
    @Test
    void falhasSqlAlheiasAoConflitoDeSnapshotNaoSaoTraduzidasComoSessaoAlterada() {
        for (String estado : List.of("08006", "23505", "40P01")) {
            var original = new PersistenceException(new SQLException("Falha SQL controlada.", estado));
            EntityManager em = (EntityManager) Proxy.newProxyInstance(EntityManager.class.getClassLoader(),
                    new Class<?>[]{EntityManager.class}, (proxy, method, arguments) -> { throw original; });
            var repository = new AcessosRepository(em);

            assertThatThrownBy(() -> repository.sessao(UUID.randomUUID())).isSameAs(original);
        }
    }
}
