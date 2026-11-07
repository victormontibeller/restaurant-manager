package br.com.restaurantmanager.plataforma.models;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.plataforma.dtos.PedidoProvisionamento;
import br.com.restaurantmanager.plataforma.services.ProvisionamentoService;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.core.env.SystemEnvironmentPropertySource;

class DominioPlataformaTest {
    @Test void cliRecusaDominioSaasAntesDeConectarAoBanco() {
        for (var ambiente : List.of(Map.<String, String>of(), Map.of("RM_PLATFORM_HOST", "gestao.localhost"))) {
            String host = ambiente.getOrDefault("RM_PLATFORM_HOST", "plataforma.localhost");
            var pedido = new PedidoProvisionamento(UUID.randomUUID(), "Empresa fictícia", host,
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
