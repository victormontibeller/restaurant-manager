package br.com.restaurantmanager.plataforma;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SenhaProvisionamentoTest {
    private ProvisionamentoService.Pedido pedido(String senha) {
        return new ProvisionamentoService.Pedido(UUID.randomUUID(), "Empresa fictícia", "senha.localhost",
                "Unidade inicial", "admin@example.invalid", senha);
    }

    @Test void recusaSenhaBrancaAntesDeReservarUmaContaQueNaoPoderiaEntrar() {
        for (String senha : List.of(" ".repeat(12), "\u2003".repeat(12))) {
            assertThatThrownBy(() -> ProvisionamentoService.validar(pedido(senha)))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Senha deve ter pelo menos 12 caracteres e no máximo 72 bytes.");
        }
    }

    @Test void preservaSenhaValidaComEspacosNasExtremidades() {
        assertThatCode(() -> ProvisionamentoService.validar(pedido(" senha fictícia válida ")))
                .doesNotThrowAnyException();
    }
}
