package br.com.restaurantmanager.identidade.exceptions;

public class ConteudoEmailInvalido extends IllegalStateException {

    public ConteudoEmailInvalido() {
        super("Conteúdo de comunicação inválido.");
    }
}
