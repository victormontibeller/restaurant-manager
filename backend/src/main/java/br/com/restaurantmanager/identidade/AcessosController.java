package br.com.restaurantmanager.identidade;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AcessosController {
    private final AcessosService service;
    public AcessosController(AcessosService service) { this.service=service; }
    public record AlterarMatriz(@Min(0) long versao,@NotBlank String perfil,@NotNull @Size(max=80) Set<@NotBlank String> acoes) {}
    public record AlterarFuncionario(@Min(0) long versao,@NotBlank String perfil,@NotNull Boolean ativo,@NotNull @Size(max=100) Set<@NotNull UUID> unidades) {}
    @GetMapping("/api/v1/configuracoes/acessos")
    public AcessosService.Matriz matriz(@AuthenticationPrincipal IdentidadeAtual ator) { return service.matriz(ator); }
    @PutMapping("/api/v1/configuracoes/acessos")
    public AcessosService.Matriz matriz(@AuthenticationPrincipal IdentidadeAtual ator,@Valid @RequestBody AlterarMatriz body) { return service.atualizarMatriz(ator,body.versao(),body.perfil(),body.acoes()); }
    @GetMapping("/api/v1/equipe")
    public List<AcessosService.Funcionario> equipe(@AuthenticationPrincipal IdentidadeAtual ator,@RequestParam(defaultValue="0") int pagina) { return service.equipe(ator,pagina); }
    @PutMapping("/api/v1/equipe/{id}")
    public AcessosService.Funcionario funcionario(@AuthenticationPrincipal IdentidadeAtual ator,@PathVariable UUID id,@Valid @RequestBody AlterarFuncionario body) { return service.atualizarFuncionario(ator,id,body.versao(),body.perfil(),body.ativo(),body.unidades()); }
    @GetMapping("/api/v1/acessos/efetivos")
    public AcessosService.Efetivo efetivo(@AuthenticationPrincipal IdentidadeAtual ator) { return service.efetivo(ator); }
    @GetMapping("/api/v1/operacao/unidades")
    public List<AcessosService.UnidadePermitida> unidades(@AuthenticationPrincipal IdentidadeAtual ator) { return service.unidades(ator); }
    @GetMapping("/api/v1/operacao/unidades/{id}")
    public AcessosService.UnidadePermitida unidade(@AuthenticationPrincipal IdentidadeAtual ator,@PathVariable UUID id) { return service.unidade(ator,id); }
}
