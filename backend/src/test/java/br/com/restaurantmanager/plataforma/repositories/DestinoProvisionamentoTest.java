package br.com.restaurantmanager.plataforma.repositories;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class DestinoProvisionamentoTest {
    private Map<String, String> ambiente(String stage) {
        return new HashMap<>(Map.of("RM_STAGE", stage,
                "RM_DB_URL", "jdbc:postgresql://127.0.0.1:55432/rm_" + stage,
                "RM_DB_USER", "rm_" + stage + "_app", "RM_MIGRATION_USER", "rm_" + stage + "_owner"));
    }

    @Test void homologacao_exige_opt_in_explicito_do_operador_privilegiado() {
        var env = ambiente("hml");
        assertThatThrownBy(() -> ProvisionamentoRepository.validarDestino(env)).isInstanceOf(IllegalArgumentException.class);
        for (String valor : new String[]{"false", "TRUE", "true ", "1"}) {
            env.put("RM_HML_PROVISIONING_ENABLED", valor);
            assertThatThrownBy(() -> ProvisionamentoRepository.validarDestino(env)).isInstanceOf(IllegalArgumentException.class);
        }
        env.put("RM_HML_PROVISIONING_ENABLED", "true");
        assertThatCode(() -> ProvisionamentoRepository.validarDestino(env)).doesNotThrowAnyException();
    }

    @Test void opt_in_nao_libera_producao_nem_identidade_parcial() {
        var prod = ambiente("prod");
        prod.put("RM_HML_PROVISIONING_ENABLED", "true");
        assertThatThrownBy(() -> ProvisionamentoRepository.validarDestino(prod)).isInstanceOf(IllegalArgumentException.class);
        for (String campo : new String[]{"RM_DB_URL", "RM_DB_USER", "RM_MIGRATION_USER", "RM_STAGE"}) {
            var env = ambiente("hml");
            env.put("RM_HML_PROVISIONING_ENABLED", "true");
            env.put(campo, "outro");
            assertThatThrownBy(() -> ProvisionamentoRepository.validarDestino(env)).isInstanceOf(IllegalArgumentException.class);
        }
    }

    @Test void desenvolvimento_e_testes_preservam_contrato() {
        for (String stage : new String[]{"dev", "test"}) {
            assertThatCode(() -> ProvisionamentoRepository.validarDestino(ambiente(stage))).doesNotThrowAnyException();
        }
    }
}
