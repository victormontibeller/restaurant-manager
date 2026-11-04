package br.com.restaurantmanager.unidades;

import br.com.restaurantmanager.identidade.IdentidadeAtual;
import java.util.UUID;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EventoUnidadeController {
    private final EventoUnidadeService service;
    public EventoUnidadeController(EventoUnidadeService service) {this.service=service;}
    @GetMapping("/api/v1/operacao/unidades/{id}/eventos")
    public EventoUnidadeService.Pagina consultar(@AuthenticationPrincipal IdentidadeAtual ator,@PathVariable UUID id,@RequestParam(defaultValue="-1") long depois) {
        return service.consultar(ator,id,depois);
    }
}
