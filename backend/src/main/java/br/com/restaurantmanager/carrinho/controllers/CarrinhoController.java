package br.com.restaurantmanager.carrinho.controllers;

import br.com.restaurantmanager.carrinho.dtos.Calcular;
import br.com.restaurantmanager.carrinho.dtos.Resumo;
import br.com.restaurantmanager.carrinho.services.CarrinhoService;
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
