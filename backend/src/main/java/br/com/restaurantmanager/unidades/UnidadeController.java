package br.com.restaurantmanager.unidades;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class UnidadeController {
    private final UnidadeService service;
    public UnidadeController(UnidadeService service) { this.service = service; }
    @GetMapping("/api/v1/unidades")
    List<UnidadeService.Resumo> listar() { return service.listar(); }
}
