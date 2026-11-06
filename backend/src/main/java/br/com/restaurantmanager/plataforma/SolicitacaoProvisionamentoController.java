package br.com.restaurantmanager.plataforma;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/plataforma/provisionamentos")
public class SolicitacaoProvisionamentoController {
    private final SolicitacaoProvisionamentoService service;
    public SolicitacaoProvisionamentoController(SolicitacaoProvisionamentoService service) { this.service=service; }
    @PostMapping @ResponseStatus(HttpStatus.ACCEPTED)
    public SolicitacaoProvisionamentoService.Resumo solicitar(@AuthenticationPrincipal PlataformaService.Identidade ator,@RequestBody ProvisionamentoService.Pedido pedido) {return service.solicitar(ator,pedido);}
    @GetMapping public List<SolicitacaoProvisionamentoService.Resumo> listar(@AuthenticationPrincipal PlataformaService.Identidade ator,@RequestParam(defaultValue="0") int pagina) {return service.listar(ator,pagina);}
    @GetMapping("/{id}") public SolicitacaoProvisionamentoService.Resumo consultar(@AuthenticationPrincipal PlataformaService.Identidade ator,@PathVariable UUID id) {return service.consultar(ator,id);}
    public record Retomada(@NotNull @Min(0) Long versao) {}
    @PostMapping("/{id}/retomar") @ResponseStatus(HttpStatus.ACCEPTED)
    public SolicitacaoProvisionamentoService.Resumo retomar(@AuthenticationPrincipal PlataformaService.Identidade ator,@PathVariable UUID id,@Valid @RequestBody Retomada pedido) {return service.retomar(ator,id,pedido.versao());}
}
