package br.com.restaurantmanager.catalogo.exceptions;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;

public final class ErrosCatalogo {
    private ErrosCatalogo() {}

    public static AuthFailure inexistente() {
        return new AuthFailure(404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado.");
    }

    public static AuthFailure conflito() {
        return new AuthFailure(409, "CONFLITO", "O catálogo foi alterado. Recarregue antes de salvar.");
    }

    public static AuthFailure regra(String mensagem) {
        return new AuthFailure(422, "CONFIGURACAO_INVALIDA", mensagem);
    }
}
