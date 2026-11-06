package br.com.restaurantmanager.plataforma;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

class DominioPlataformaTest {
    @Test void cliRecusaDominioSaasAntesDeConectarAoBanco() {
        for (var ambiente : java.util.List.of(Map.<String, String>of(), Map.of("RM_PLATFORM_HOST", "gestao.localhost"))) {
            String host = ambiente.getOrDefault("RM_PLATFORM_HOST", "plataforma.localhost");
            var pedido = new ProvisionamentoService.Pedido(UUID.randomUUID(), "Empresa fictícia", host,
                    "Unidade inicial", "admin@example.invalid", UUID.randomUUID().toString());

            assertThatThrownBy(() -> new ProvisionamentoService(ambiente).reservar(pedido))
                    .isInstanceOf(IllegalArgumentException.class).hasMessage("Domínio indisponível para empresa.");
        }
    }

    @Test void springEComandoPrivilegiadoUsamMesmoNomeDeVariavel() {
        var ambiente = new StandardEnvironment();
        ambiente.getPropertySources().addFirst(new SystemEnvironmentPropertySource("teste",
                Map.of("RM_PLATFORM_HOST", "gestao.localhost")));

        assertThat(ambiente.resolveRequiredPlaceholders(DominioPlataforma.CONFIGURACAO))
                .isEqualTo("gestao.localhost");
    }
}
