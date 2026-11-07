package br.com.restaurantmanager.unidades.controllers;

import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.unidades.dtos.AlterarFuncionamentoUnidade;
import br.com.restaurantmanager.unidades.dtos.DetalheFuncionamentoUnidade;
import br.com.restaurantmanager.unidades.dtos.FuncionamentoPublicoUnidade;
import br.com.restaurantmanager.unidades.services.FuncionamentoUnidadeService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class FuncionamentoUnidadeController {
    private final FuncionamentoUnidadeService service;

    public FuncionamentoUnidadeController(FuncionamentoUnidadeService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/configuracoes/unidades/{id}/funcionamento")
    public DetalheFuncionamentoUnidade consultar(
            @AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.consultar(ator, id);
    }

    @PutMapping("/api/v1/configuracoes/unidades/{id}/funcionamento")
    public DetalheFuncionamentoUnidade alterar(
            @AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @Valid @RequestBody AlterarFuncionamentoUnidade body) {
        return service.alterar(ator, id, body.versao(), body.versaoUnidade(), body.canais(), body.horarios());
    }

    @GetMapping("/api/v1/unidades/{id}/funcionamento")
    public FuncionamentoPublicoUnidade consultarPublico(@PathVariable UUID id) {
        return service.consultarPublico(id);
    }
}
