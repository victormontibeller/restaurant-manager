package br.com.restaurantmanager.midia;

import br.com.restaurantmanager.identidade.AuthFailure;
import br.com.restaurantmanager.identidade.IdentidadeAtual;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class MidiaService {
    private final NormalizadorImagem normalizador;
    private final MidiaTransacoes transacoes;
    private final MidiaRepository repository;

    public MidiaService(NormalizadorImagem normalizador, MidiaTransacoes transacoes, MidiaRepository repository) {
        this.normalizador = normalizador;
        this.transacoes = transacoes;
        this.repository = repository;
    }

    public record Publicacao(MidiaResumo midia, boolean criada) {}

    public record Conteudo(MidiaResumo midia, byte[] bytes) {}

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public Publicacao enviar(IdentidadeAtual ator, UUID id, MultipartFile arquivo) {
        transacoes.autorizar(ator);
        ImagemNormalizada imagem = normalizador.normalizar(arquivo);
        return transacoes.publicar(ator, id, imagem);
    }

    public MidiaResumo consultar(IdentidadeAtual ator, UUID id) {
        return transacoes.consultar(ator, id);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public MidiaResumo exigirPublicada(UUID id) {
        return repository.consultar(id).map(MidiaRepository.Registro::resumo).orElseThrow(MidiaService::inexistente);
    }

    @Transactional(readOnly = true, timeout = 10)
    public Conteudo conteudoPublico(UUID id) {
        var resumo = repository.consultar(id).map(MidiaRepository.Registro::resumo).orElseThrow(MidiaService::inexistente);
        return new Conteudo(resumo, repository.conteudo(id));
    }

    static AuthFailure inexistente() {
        return new AuthFailure(404, "MIDIA_NAO_ENCONTRADA", "Imagem não encontrada.");
    }
}
