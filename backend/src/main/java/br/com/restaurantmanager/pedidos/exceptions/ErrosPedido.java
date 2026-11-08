package br.com.restaurantmanager.pedidos.exceptions;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;

public final class ErrosPedido {
    private ErrosPedido() {}

    public static AuthFailure inexistente() {
        return new AuthFailure(404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado.");
    }

    public static AuthFailure conflito(String mensagem) {
        return new AuthFailure(409, "CONFLITO", mensagem);
    }

    public static AuthFailure regra(String mensagem) {
        return new AuthFailure(422, "REGRA_PEDIDO", mensagem);
    }

    public static String motivo(String valor) {
        String motivo = valor == null ? "" : valor.strip();
        if (motivo.isEmpty() || motivo.length() > 500 || motivo.chars().anyMatch(c -> Character.isISOControl(c) && c != '\n')) {
            throw regra("Informe um motivo entre 1 e 500 caracteres, sem caracteres de controle.");
        }
        return motivo;
    }
}
