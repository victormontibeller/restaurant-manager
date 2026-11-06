package br.com.restaurantmanager.catalogo;

import br.com.restaurantmanager.identidade.AuthFailure;
import br.com.restaurantmanager.identidade.IdentidadeAtual;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/clientes/me/favoritos")
public class FavoritosController {
    private final FavoritosService service;

    public FavoritosController(FavoritosService service) {
        this.service = service;
    }

    @GetMapping
    public FavoritosService.Favoritos listar(@AuthenticationPrincipal IdentidadeAtual ator) {
        return service.listar(ator);
    }

    @PutMapping("/{produtoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void incluir(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID produtoId,
            @RequestBody(required = false) String body) {
        semCorpo(body);
        service.incluir(ator, produtoId);
    }

    @DeleteMapping("/{produtoId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remover(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID produtoId,
            @RequestBody(required = false) String body) {
        semCorpo(body);
        service.remover(ator, produtoId);
    }

    private void semCorpo(String body) {
        if (body != null && !body.isBlank()) {
            throw new AuthFailure(400, "ENTRADA_INVALIDA", "Esta operação não recebe dados no corpo da requisição.");
        }
    }
}
