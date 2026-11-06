package br.com.restaurantmanager.identidade.controllers;

import br.com.restaurantmanager.identidade.dtos.AcessosEfetivos;
import br.com.restaurantmanager.identidade.dtos.AlterarFuncionarioRequest;
import br.com.restaurantmanager.identidade.dtos.AlterarMatrizRequest;
import br.com.restaurantmanager.identidade.dtos.FuncionarioResumo;
import br.com.restaurantmanager.identidade.dtos.MatrizAcessos;
import br.com.restaurantmanager.identidade.dtos.UnidadePermitida;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AcessosController {
    private final AcessosService service;

    public AcessosController(AcessosService service) {
        this.service = service;
    }

    @GetMapping("/api/v1/configuracoes/acessos")
    public MatrizAcessos matriz(@AuthenticationPrincipal IdentidadeAtual ator) {
        return service.matriz(ator);
    }

    @PutMapping("/api/v1/configuracoes/acessos")
    public MatrizAcessos matriz(@AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody AlterarMatrizRequest body) {
        return service.atualizarMatriz(ator, body.versao(), body.perfil(), body.acoes());
    }

    @GetMapping("/api/v1/equipe")
    public List<FuncionarioResumo> equipe(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam(defaultValue = "0") int pagina) {
        return service.equipe(ator, pagina);
    }

    @PutMapping("/api/v1/equipe/{id}")
    public FuncionarioResumo funcionario(
            @AuthenticationPrincipal IdentidadeAtual ator,
            @PathVariable UUID id,
            @Valid @RequestBody AlterarFuncionarioRequest body) {
        return service.atualizarFuncionario(ator, id, body.versao(), body.perfil(), body.ativo(), body.unidades());
    }

    @GetMapping("/api/v1/acessos/efetivos")
    public AcessosEfetivos efetivo(@AuthenticationPrincipal IdentidadeAtual ator) {
        return service.efetivo(ator);
    }

    @GetMapping("/api/v1/operacao/unidades")
    public List<UnidadePermitida> unidades(@AuthenticationPrincipal IdentidadeAtual ator) {
        return service.unidades(ator);
    }

    @GetMapping("/api/v1/operacao/unidades/{id}")
    public UnidadePermitida unidade(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return service.unidade(ator, id);
    }
}
