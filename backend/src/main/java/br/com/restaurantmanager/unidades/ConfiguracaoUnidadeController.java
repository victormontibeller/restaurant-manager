package br.com.restaurantmanager.unidades;

import br.com.restaurantmanager.identidade.IdentidadeAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/configuracoes/unidades")
public class ConfiguracaoUnidadeController {
    private final ConfiguracaoUnidadeService service;
    public ConfiguracaoUnidadeController(ConfiguracaoUnidadeService service) {this.service=service;}
    public record Criar(@NotNull UUID id,@NotBlank @Size(max=120) String nome,@NotBlank @Size(max=60) String fuso,@NotNull Boolean ativa) {}
    public record Alterar(@NotNull @Min(0) Long versao,@NotBlank @Size(max=120) String nome,@NotBlank @Size(max=60) String fuso,@NotNull Boolean ativa) {}
    @GetMapping
    public List<ConfiguracaoUnidadeService.Detalhe> listar(@AuthenticationPrincipal IdentidadeAtual ator,@RequestParam(defaultValue="0") int pagina) {return service.listar(ator,pagina);}
    @GetMapping("/{id}")
    public ConfiguracaoUnidadeService.Detalhe consultar(@AuthenticationPrincipal IdentidadeAtual ator,@PathVariable UUID id) {return service.consultar(ator,id);}
    @PostMapping
    public ConfiguracaoUnidadeService.Detalhe criar(@AuthenticationPrincipal IdentidadeAtual ator,@Valid @RequestBody Criar body) {return service.criar(ator,body.id(),body.nome(),body.fuso(),body.ativa());}
    @PutMapping("/{id}")
    public ConfiguracaoUnidadeService.Detalhe alterar(@AuthenticationPrincipal IdentidadeAtual ator,@PathVariable UUID id,@Valid @RequestBody Alterar body) {return service.alterar(ator,id,body.versao(),body.nome(),body.fuso(),body.ativa());}
}
