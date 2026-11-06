package br.com.restaurantmanager.unidades.services;

import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.unidades.dtos.EventoUnidadeResposta;
import br.com.restaurantmanager.unidades.dtos.PaginaEventosUnidade;
import br.com.restaurantmanager.unidades.dtos.UnidadeAtualEventos;
import br.com.restaurantmanager.unidades.repositories.EventoUnidadeRepository;
import br.com.restaurantmanager.unidades.repositories.UnidadeRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EventoUnidadeService {
    private final EventoUnidadeRepository eventos;
    private final UnidadeRepository unidades;
    private final AcessosService acessos;

    public EventoUnidadeService(
            EventoUnidadeRepository eventos, UnidadeRepository unidades, AcessosService acessos) {
        this.eventos = eventos;
        this.unidades = unidades;
        this.acessos = acessos;
    }

    @Transactional(timeout = 10)
    public PaginaEventosUnidade consultar(IdentidadeAtual ator, UUID unidade, long depois) {
        // Mesmo lock dos escritores: ordem de commit não pode pular uma versão ainda invisível.
        acessos.autorizar(ator, Acao.UNIDADE_ACOMPANHAR, unidade);
        if (depois < -1) {
            throw new AuthFailure(400, "CURSOR_INVALIDO", "Informe um cursor a partir de -1.");
        }
        var atual = unidades.findById(unidade).orElseThrow(() -> new AuthFailure(
                404, "RECURSO_NAO_ENCONTRADO", "Recurso não encontrado."));
        if (depois > atual.getVersao()) {
            throw new AuthFailure(409, "CURSOR_ADIANTADO",
                    "A versão não pertence ao estado atual. Reinicie a consulta desta unidade.");
        }

        var encontrados = eventos.apos(unidade, depois);
        boolean mais = encontrados.size() > 50;
        var pagina = encontrados.stream().limit(50)
                .map(evento -> new EventoUnidadeResposta(Long.toString(evento.getVersao()),
                        evento.getTipo(), evento.getNome(), evento.getFuso(), evento.isAtiva(),
                        evento.getOcorridoEm()))
                .toList();
        String proximo = mais ? pagina.getLast().versao() : Long.toString(atual.getVersao());
        return new PaginaEventosUnidade(
                new UnidadeAtualEventos(atual.getId(), atual.getNome(), atual.getFuso(),
                        Long.toString(atual.getVersao())),
                pagina, proximo, mais);
    }
}
