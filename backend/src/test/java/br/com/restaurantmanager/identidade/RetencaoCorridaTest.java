package br.com.restaurantmanager.identidade;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

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
        var refresh = new RefreshToken(hash, UUID.randomUUID());
        when(repository.refresh(hash)).thenReturn(refresh);
        when(repository.sessao(refresh.sessaoId, true)).thenReturn(null);
        assertThatThrownBy(() -> service.refresh(raw)).isInstanceOfSatisfying(AuthFailure.class, failure ->
                org.assertj.core.api.Assertions.assertThat(failure.status()).isEqualTo(401));
        assertThatThrownBy(() -> service.logout(raw)).isInstanceOfSatisfying(AuthFailure.class, failure ->
                org.assertj.core.api.Assertions.assertThat(failure.status()).isEqualTo(401));
        verifyNoInteractions(encoder);
    }
}
