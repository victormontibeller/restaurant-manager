package br.com.restaurantmanager;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;

import br.com.restaurantmanager.identidade.models.Usuario;
import br.com.restaurantmanager.tenancy.context.TenantScope;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.engine.spi.SessionFactoryImplementor;
import org.hibernate.query.hql.HqlTranslator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = "rm.auth.retencao-agendada=false")
class ConsultaLoginStartupTest {
    @Autowired EntityManagerFactory entityManagerFactory;

    @BeforeAll static void preparar() throws Exception { TestDatabase.prepare(); }

    @Test void interpretaConsultaDeLoginAntesDoPrimeiroUsuarioSemExecutarSqlEmpresarial() {
        var factory = entityManagerFactory.unwrap(SessionFactoryImplementor.class);
        var cache = factory.getQueryEngine().getInterpretationCache();
        var translator = mock(HqlTranslator.class);
        String hql = "from Usuario where email=:email";
        doThrow(new AssertionError("Login não deve compilar HQL pela primeira vez na requisição."))
                .when(translator).translate(hql, Usuario.class);

        assertThat(TenantScope.current()).isEqualTo("__none__");
        assertThat(cache.resolveHqlInterpretation(hql, Usuario.class, translator)).isNotNull();
        verifyNoInteractions(translator);
        // Criar a consulta tipada não executa SQL nem seleciona um tenant de aquecimento.
        try (var em = entityManagerFactory.createEntityManager()) {
            var query = em.createNamedQuery("Usuario.porEmail", Usuario.class);
            assertThat(query.getParameter("email").getParameterType()).isEqualTo(String.class);
        }
        assertThat(TenantScope.current()).isEqualTo("__none__");
    }
}
