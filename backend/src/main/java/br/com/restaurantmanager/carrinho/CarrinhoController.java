package br.com.restaurantmanager.carrinho;

import br.com.restaurantmanager.carrinho.ContratoCarrinho.Calcular;
import br.com.restaurantmanager.carrinho.ContratoCarrinho.Resumo;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CarrinhoController {
    private final CarrinhoService service;

    public CarrinhoController(CarrinhoService service) {
        this.service = service;
    }

    @PostMapping("/api/v1/carrinho/calcular")
    public Resumo calcular(@Valid @RequestBody Calcular body) {
        return service.calcular(body);
    }
}
