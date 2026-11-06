package br.com.restaurantmanager.catalogo.controllers;

import br.com.restaurantmanager.catalogo.dtos.CatalogoPublico;
import br.com.restaurantmanager.catalogo.dtos.ProdutoPublico;
import br.com.restaurantmanager.catalogo.services.CatalogoPublicoService;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class CatalogoPublicoController {
    private final CatalogoPublicoService service;

    public CatalogoPublicoController(CatalogoPublicoService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/catalogo")
    public CatalogoPublico listar(@RequestParam UUID unidadeId, @RequestParam CanalAtendimento canal,
            @RequestParam(defaultValue = "") @Size(max = 120) String busca,
            @RequestParam(required = false) UUID categoriaId,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int pagina) {
        return service.listar(unidadeId, canal, busca, categoriaId, pagina);
    }

    @GetMapping("/api/v1/catalogo/{id}")
    public ProdutoPublico consultar(@PathVariable UUID id, @RequestParam UUID unidadeId, @RequestParam CanalAtendimento canal) {
        return service.consultar(id, unidadeId, canal);
    }

    @GetMapping("/api/v1/operacao/catalogo")
    public CatalogoPublico operacional(@AuthenticationPrincipal IdentidadeAtual ator, @RequestParam UUID unidadeId,
            @RequestParam(defaultValue = "DELIVERY") CanalAtendimento canal,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int pagina) {
        return service.operacional(ator, unidadeId, canal, pagina);
    }
}
