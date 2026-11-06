package br.com.restaurantmanager.identidade.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.RefreshToken;
import br.com.restaurantmanager.identidade.repositories.IdentidadeRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtEncoder;

class RetencaoCorridaTest {
    @Test void sessaoRemovidaEntreConsultaDoHashELockRecusaRefreshELogout() {
        var repository = mock(IdentidadeRepository.class);
        var encoder = mock(JwtEncoder.class);
        var service = new IdentidadeService(repository, encoder);
        String raw = "a".repeat(43);
        String hash = IdentidadeService.hash(raw);
        var refresh = RefreshToken.criar(hash, UUID.randomUUID());
        when(repository.refresh(hash)).thenReturn(refresh);
        when(repository.sessao(refresh.getSessaoId(), true)).thenReturn(null);
        assertThatThrownBy(() -> service.refresh(raw)).isInstanceOfSatisfying(AuthFailure.class, failure ->
                assertThat(failure.status()).isEqualTo(401));
        assertThatThrownBy(() -> service.logout(raw)).isInstanceOfSatisfying(AuthFailure.class, failure ->
                assertThat(failure.status()).isEqualTo(401));
        verifyNoInteractions(encoder);
    }
}
