package br.com.restaurantmanager.midia.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.midia.dtos.ConteudoMidia;
import br.com.restaurantmanager.midia.dtos.ImagemNormalizada;
import br.com.restaurantmanager.midia.dtos.MidiaResumo;
import br.com.restaurantmanager.midia.dtos.PublicacaoMidia;
import br.com.restaurantmanager.midia.dtos.RegistroMidia;
import br.com.restaurantmanager.midia.repositories.MidiaRepository;
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

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public PublicacaoMidia enviar(IdentidadeAtual ator, UUID id, MultipartFile arquivo) {
        transacoes.autorizar(ator);
        ImagemNormalizada imagem = normalizador.normalizar(arquivo);
        return transacoes.publicar(ator, id, imagem);
    }

    public MidiaResumo consultar(IdentidadeAtual ator, UUID id) {
        return transacoes.consultar(ator, id);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public MidiaResumo exigirPublicada(UUID id) {
        return repository.consultar(id).map(RegistroMidia::resumo).orElseThrow(MidiaService::inexistente);
    }

    @Transactional(readOnly = true, timeout = 10)
    public ConteudoMidia conteudoPublico(UUID id) {
        var resumo = repository.consultar(id).map(RegistroMidia::resumo).orElseThrow(MidiaService::inexistente);
        return new ConteudoMidia(resumo, repository.conteudo(id));
    }

    static AuthFailure inexistente() {
        return new AuthFailure(404, "MIDIA_NAO_ENCONTRADA", "Imagem não encontrada.");
    }
}
