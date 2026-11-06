package br.com.restaurantmanager.identidade;

import java.nio.charset.StandardCharsets;

/** Regra comum para definir uma senha; não normaliza nem altera o valor recebido. */
public final class PoliticaSenha {
    private PoliticaSenha() {}

    public static boolean novaSenhaValida(String senha) {
        return senha != null && !senha.isBlank() && senha.length() >= 12
                && senha.getBytes(StandardCharsets.UTF_8).length <= 72;
    }
}
