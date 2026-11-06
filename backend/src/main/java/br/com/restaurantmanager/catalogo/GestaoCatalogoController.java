package br.com.restaurantmanager.catalogo;

import br.com.restaurantmanager.catalogo.ContratoCatalogo.AlterarOferta;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Categoria;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Oferta;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Pagina;
import br.com.restaurantmanager.catalogo.ContratoCatalogo.Produto;
import br.com.restaurantmanager.identidade.IdentidadeAtual;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
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
@RequestMapping("/api/v1/gestao/catalogo")
public class GestaoCatalogoController {
    private final GestaoCatalogoService gestao;
    private final OfertaProdutoService ofertas;

    public GestaoCatalogoController(GestaoCatalogoService gestao, OfertaProdutoService ofertas) {
        this.gestao = gestao;
        this.ofertas = ofertas;
    }

    @GetMapping("/categorias")
    public Pagina<Categoria> categorias(@AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int pagina) {
        return gestao.categorias(ator, pagina);
    }

    @PostMapping("/categorias")
    public Categoria criarCategoria(@AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody Categoria body) {
        return gestao.criarCategoria(ator, body);
    }

    @PutMapping("/categorias/{id}")
    public Categoria alterarCategoria(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @Valid @RequestBody Categoria body) {
        return gestao.alterarCategoria(ator, id, body);
    }

    @GetMapping("/produtos")
    public Pagina<Produto> produtos(@AuthenticationPrincipal IdentidadeAtual ator,
            @RequestParam(defaultValue = "0") @Min(0) @Max(10000) int pagina) {
        return gestao.produtos(ator, pagina);
    }

    @GetMapping("/produtos/{id}")
    public Produto produto(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id) {
        return gestao.produto(ator, id);
    }

    @PostMapping("/produtos")
    public Produto criarProduto(@AuthenticationPrincipal IdentidadeAtual ator, @Valid @RequestBody Produto body) {
        return gestao.criarProduto(ator, body);
    }

    @PutMapping("/produtos/{id}")
    public Produto alterarProduto(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @Valid @RequestBody Produto body) {
        return gestao.alterarProduto(ator, id, body);
    }

    @GetMapping("/produtos/{id}/unidades/{unidadeId}")
    public Oferta oferta(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id, @PathVariable UUID unidadeId) {
        return ofertas.consultar(ator, id, unidadeId);
    }

    @PutMapping("/produtos/{id}/unidades/{unidadeId}")
    public Oferta alterarOferta(@AuthenticationPrincipal IdentidadeAtual ator, @PathVariable UUID id,
            @PathVariable UUID unidadeId, @Valid @RequestBody AlterarOferta body) {
        return ofertas.alterar(ator, id, unidadeId, body);
    }
}
