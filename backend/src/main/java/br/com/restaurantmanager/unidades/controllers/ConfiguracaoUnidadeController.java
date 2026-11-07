package br.com.restaurantmanager.unidades.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.unidades.dtos.AlterarUnidade;
import br.com.restaurantmanager.unidades.dtos.CriarUnidade;
import br.com.restaurantmanager.unidades.dtos.DetalheUnidade;
import br.com.restaurantmanager.unidades.services.ConfiguracaoUnidadeService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/configuracoes/unidades")
public class ConfiguracaoUnidadeController {
    private final ConfiguracaoUnidadeService service;

    public ConfiguracaoUnidadeController(ConfiguracaoUnidadeService service) {
        this.service = service;
    }

    @GetMapping
    public List<DetalheUnidade> listar(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.listar(ator, pagina);
    }

    @GetMapping("/{id}")
    public DetalheUnidade consultar(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.consultar(ator, id);
    }

    @PostMapping
    public DetalheUnidade criar(
            @AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody CriarUnidade body) {
        return service.criar(ator, body.id(), body.nome(), body.fuso(), body.ativa());
    }

    @PutMapping("/{id}")
    public DetalheUnidade alterar(
            @AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @Valid @RequestBody AlterarUnidade body) {
        return service.alterar(ator, id, body.versao(), body.nome(), body.fuso(), body.ativa());
    }
}
