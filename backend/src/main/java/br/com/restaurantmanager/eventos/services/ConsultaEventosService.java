package br.com.restaurantmanager.eventos.services;

import br.com.restaurantmanager.eventos.dtos.EventoOperacionalResposta;
import br.com.restaurantmanager.eventos.dtos.PaginaEventosOperacionais;
import br.com.restaurantmanager.eventos.repositories.EventoOperacionalRepository;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.mesas.services.MesaSessaoService;
import br.com.restaurantmanager.mesas.services.ComandaService;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConsultaEventosService {
    private final EventoOperacionalRepository repository;
    private final AcessosService acessos;
    private final MesaSessaoService mesas;
    private final ComandaService comandas;

    public ConsultaEventosService(EventoOperacionalRepository repository, AcessosService acessos,
            MesaSessaoService mesas, ComandaService comandas) {
        this.repository = repository;
        this.acessos = acessos;
        this.mesas = mesas;
        this.comandas = comandas;
    }

    @Transactional(timeout = 10)
    public PaginaEventosOperacionais empresa(IdentidadeAtual ator, UUID unidade, String depois) {
        String fluxo;
        if (ator.perfil().equals("CLIENTE")) {
            acessos.autorizarCliente(ator);
            fluxo = "cliente:" + unidade + ":" + ator.usuarioId();
        } else {
            acessos.autorizarOperacaoExistente(ator, Acao.PEDIDO_CONSULTAR, unidade);
            fluxo = "operacao:" + unidade;
        }
        return pagina(fluxo, "", cursor(depois));
    }

    @Transactional(timeout = 10)
    public PaginaEventosOperacionais mesa(ParticipanteAtual ator, String depois) {
        acessos.bloquearPoliticaOperacional();
        comandas.bloquear(ator.comandaId());
        mesas.validar(ator);
        String[] partes = depois == null || depois.equals("-1") ? new String[]{"0", "0"} : depois.split("\\.", -1);
        if (partes.length != 2) throw cursorInvalido();
        var propria = pagina("participante:" + ator.participanteId(), "p:", cursor(partes[0]));
        var compartilhada = pagina("comanda:" + ator.comandaId(), "c:", cursor(partes[1]));
        var eventos = new ArrayList<EventoOperacionalResposta>(propria.eventos());
        eventos.addAll(compartilhada.eventos());
        return new PaginaEventosOperacionais(List.copyOf(eventos), propria.proximo() + "." + compartilhada.proximo(),
                propria.temMais() || compartilhada.temMais());
    }

    private PaginaEventosOperacionais pagina(String fluxo, String prefixo, long depois) {
        long atual = repository.atual(fluxo);
        if (depois > atual) throw new AuthFailure(409, "CURSOR_ADIANTADO", "Reinicie o acompanhamento deste contexto.");
        var encontrados = repository.consultar(fluxo, prefixo, depois, atual);
        boolean mais = encontrados.size() > 50;
        var eventos = encontrados.stream().limit(50).toList();
        long proximo = mais ? Long.parseLong(eventos.getLast().id().substring(prefixo.length())) : atual;
        return new PaginaEventosOperacionais(eventos, Long.toString(proximo), mais);
    }

    private long cursor(String valor) {
        if (valor == null || valor.equals("-1")) return 0;
        if (!valor.matches("[0-9]{1,19}")) throw cursorInvalido();
        try {
            return Long.parseLong(valor);
        } catch (NumberFormatException error) {
            throw cursorInvalido();
        }
    }

    private AuthFailure cursorInvalido() {
        return new AuthFailure(400, "CURSOR_INVALIDO", "Informe o cursor retornado para este acompanhamento.");
    }
}
