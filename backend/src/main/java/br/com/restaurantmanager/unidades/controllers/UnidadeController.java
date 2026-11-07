package br.com.restaurantmanager.unidades.controllers;

import br.com.restaurantmanager.unidades.dtos.ResumoUnidade;
import br.com.restaurantmanager.unidades.services.UnidadeService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UnidadeController {
    private final UnidadeService service;

    public UnidadeController(UnidadeService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/unidades")
    public List<ResumoUnidade> listar() {
        return service.listar();
    }
}
