package br.com.restaurantmanager.plataforma.services;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import br.com.restaurantmanager.plataforma.dtos.PedidoProvisionamento;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class SenhaProvisionamentoTest {
    private PedidoProvisionamento pedido(String senha) {
        return new PedidoProvisionamento(UUID.randomUUID(), "Empresa fictícia", "senha.localhost",
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
