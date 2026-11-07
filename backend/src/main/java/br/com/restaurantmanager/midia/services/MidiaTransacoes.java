package br.com.restaurantmanager.midia.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.midia.dtos.ImagemNormalizada;
import br.com.restaurantmanager.midia.dtos.MidiaResumo;
import br.com.restaurantmanager.midia.dtos.PublicacaoMidia;
import br.com.restaurantmanager.midia.dtos.RegistroMidia;
import br.com.restaurantmanager.midia.repositories.MidiaRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Fases curtas: a decodificação nunca mantém transação nem lock de autorização. */
@Service
public class MidiaTransacoes {
    private static final int MAXIMA_QUANTIDADE = 200;
    private static final long MAXIMO_BYTES_TENANT = 100L * 1024 * 1024;

    private final AcessosService acessos;
    private final MidiaRepository repository;

    public MidiaTransacoes(AcessosService acessos, MidiaRepository repository) {
        this.acessos = acessos;
        this.repository = repository;
    }

    @Transactional(timeout = 10)
    public void autorizar(IdentidadeAtual ator) {
        acessos.autorizar(ator, Acao.CATALOGO_EDITAR, null);
    }

    @Transactional(timeout = 10)
    public PublicacaoMidia publicar(IdentidadeAtual ator, UUID id, ImagemNormalizada imagem) {
        acessos.autorizar(ator, Acao.CATALOGO_EDITAR, null);
        var cota = repository.bloquearCota();
        acessos.autorizar(ator, Acao.CATALOGO_EDITAR, null);
        var existente = repository.consultar(id);
        if (existente.isPresent()) {
            var registro = existente.orElseThrow();
            if (!registro.autorId().equals(ator.usuarioId()) || !registro.resumo().sha256().equals(imagem.sha256())) {
                throw new AuthFailure(409, "INTENCAO_DIVERGENTE", "Esta intenção de envio já pertence a outra imagem ou autor.");
            }
            return new PublicacaoMidia(registro.resumo(), false);
        }
        if (cota.quantidade() >= MAXIMA_QUANTIDADE || cota.bytes() + imagem.conteudo().length > MAXIMO_BYTES_TENANT) {
            throw new AuthFailure(422, "COTA_MIDIA_EXCEDIDA", "A empresa atingiu o limite de 200 imagens ou 100 MiB de mídia.");
        }
        repository.publicar(id, ator.usuarioId(), imagem);
        return new PublicacaoMidia(MidiaResumo.criar(id, imagem.tipo(), imagem.largura(),
                imagem.altura(), imagem.conteudo().length, imagem.sha256()), true);
    }

    @Transactional(timeout = 10)
    public MidiaResumo consultar(IdentidadeAtual ator, UUID id) {
        acessos.autorizar(ator, Acao.CATALOGO_EDITAR, null);
        return repository.consultar(id).map(RegistroMidia::resumo).orElseThrow(MidiaService::inexistente);
    }
}
