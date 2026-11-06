package br.com.restaurantmanager.catalogo;

import br.com.restaurantmanager.identidade.AcessosService;
import br.com.restaurantmanager.identidade.IdentidadeAtual;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FavoritosService {
    private final FavoritosRepository repository;
    private final CatalogoRepository catalogo;
    private final AcessosService acessos;

    public FavoritosService(FavoritosRepository repository, CatalogoRepository catalogo, AcessosService acessos) {
        this.repository = repository;
        this.catalogo = catalogo;
        this.acessos = acessos;
    }

    public record Favoritos(List<UUID> produtoIds) {}

    @Transactional
    public Favoritos listar(IdentidadeAtual ator) {
        acessos.autorizarCliente(ator);
        return new Favoritos(repository.listar(ator.usuarioId()));
    }

    @Transactional
    public void incluir(IdentidadeAtual ator, UUID id) {
        acessos.autorizarCliente(ator);
        repository.bloquear(ator.usuarioId());
        acessos.autorizarCliente(ator);
        var produto = catalogo.produto(id).orElseThrow(ErrosCatalogo::inexistente);
        if (!produto.ativo() || !catalogo.categoria(produto.categoriaId()).map(ContratoCatalogo.Categoria::ativa).orElse(false)) {
            throw ErrosCatalogo.inexistente();
        }
        if (repository.existe(ator.usuarioId(), id)) return;
        // Vínculos ocultos não podem esgotar a cota sem oferecer recuperação pela interface.
        // A limpeza pertence à inclusão, sob o mesmo lock do titular; consultar não altera dados.
        repository.removerInativos(ator.usuarioId());
        if (repository.contar(ator.usuarioId()) >= 200) {
            throw ErrosCatalogo.regra("O limite é de 200 favoritos por cliente.");
        }
        repository.incluir(ator.usuarioId(), id);
    }

    @Transactional
    public void remover(IdentidadeAtual ator, UUID id) {
        acessos.autorizarCliente(ator);
        repository.bloquear(ator.usuarioId());
        acessos.autorizarCliente(ator);
        catalogo.produto(id).orElseThrow(ErrosCatalogo::inexistente);
        repository.remover(ator.usuarioId(), id);
    }
}
