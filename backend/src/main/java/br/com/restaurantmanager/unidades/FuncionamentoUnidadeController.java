package br.com.restaurantmanager.unidades;

import br.com.restaurantmanager.identidade.IdentidadeAtual;
import br.com.restaurantmanager.unidades.FuncionamentoUnidadeService.Horario;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
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

    public record Alterar(
            @NotNull @Min(0) Long versao,
            @NotNull @Min(0) Long versaoUnidade,
            @NotNull @Size(max = 3) List<@NotNull CanalAtendimento> canais,
            @NotNull @Size(max = 84) List<@NotNull @Valid Horario> horarios) {}

    @GetMapping("/api/v1/configuracoes/unidades/{id}/funcionamento")
    public FuncionamentoUnidadeService.Detalhe consultar(
            @AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.consultar(ator, id);
    }

    @PutMapping("/api/v1/configuracoes/unidades/{id}/funcionamento")
    public FuncionamentoUnidadeService.Detalhe alterar(
            @AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @Valid @RequestBody Alterar body) {
        return service.alterar(ator, id, body.versao(), body.versaoUnidade(), body.canais(), body.horarios());
    }

    @GetMapping("/api/v1/unidades/{id}/funcionamento")
    public FuncionamentoUnidadeService.Publico consultarPublico(@PathVariable UUID id) {
        return service.consultarPublico(id);
    }
}
