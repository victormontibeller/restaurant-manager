package br.com.restaurantmanager.mesas.exceptions;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;

public final class ErrosMesa {
    private ErrosMesa() {}

    public static AuthFailure inexistente() {
        return new AuthFailure(404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado.");
    }

    public static AuthFailure conflito(String mensagem) {
        return new AuthFailure(409, "CONFLITO", mensagem);
    }

    public static AuthFailure regra(String mensagem) {
        return new AuthFailure(422, "REGRA_MESA", mensagem);
    }
}
