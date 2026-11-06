package br.com.restaurantmanager.catalogo;

import br.com.restaurantmanager.identidade.AuthFailure;
import java.math.BigDecimal;
import java.math.RoundingMode;

public final class Dinheiro {
    public static final BigDecimal ZERO = new BigDecimal("0.00");

    private Dinheiro() {}

    public static BigDecimal ler(String valor) {
        if (valor == null || !valor.matches("(?:0|[1-9][0-9]{0,5})(?:\\.[0-9]{1,2})?")) {
            throw new AuthFailure(400, "VALOR_MONETARIO_INVALIDO",
                    "Informe um valor entre 0 e 999999.99, com no máximo duas casas decimais.");
        }
        return new BigDecimal(valor).setScale(2, RoundingMode.UNNECESSARY);
    }

    public static String texto(BigDecimal valor) {
        return valor.setScale(2, RoundingMode.UNNECESSARY).toPlainString();
    }
}
