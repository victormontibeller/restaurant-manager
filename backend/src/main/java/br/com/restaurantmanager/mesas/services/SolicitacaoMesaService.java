package br.com.restaurantmanager.mesas.services;

import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.dtos.SolicitacaoMesa;
import br.com.restaurantmanager.mesas.dtos.SolicitarMesa;
import br.com.restaurantmanager.mesas.exceptions.ErrosMesa;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.mesas.repositories.MesaRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SolicitacaoMesaService {
    private final MesaRepository repository;
    private final ComandaService comandas;
    private final MesaSessaoService sessoes;
    private final AcessosService acessos;
    private final EventoOperacionalService eventos;

    public SolicitacaoMesaService(MesaRepository repository, ComandaService comandas, MesaSessaoService sessoes,
            AcessosService acessos, EventoOperacionalService eventos) {
        this.repository = repository;
        this.comandas = comandas;
        this.sessoes = sessoes;
        this.acessos = acessos;
        this.eventos = eventos;
    }

    @Transactional
    public SolicitacaoMesa solicitar(ParticipanteAtual ator, SolicitarMesa pedido) {
        acessos.bloquearPoliticaOperacional();
        repository.bloquearIntencao(pedido.intencaoId());
        var comanda = comandas.bloquear(ator.comandaId());
        sessoes.validar(ator);
        var existente = repository.solicitacaoPorIntencao(pedido.intencaoId());
        if (existente != null) {
            if (!existente.comandaId().equals(comanda.id()) || !existente.tipo().equals(pedido.tipo())
                    || !ator.participanteId().equals(repository.autorSolicitacao(existente.id()))) {
                throw ErrosMesa.conflito("Esta intenção já foi usada em outra solicitação.");
            }
            return existente;
        }
        UUID id = UUID.randomUUID();
        repository.solicitar(id, pedido.intencaoId(), comanda.id(), ator.participanteId(), pedido.tipo());
        repository.auditar(ator.participanteId(), id, "SOLICITACAO_MESA", "INEXISTENTE", pedido.tipo());
        eventos.registrar(comanda.unidadeId(), "MESA_" + pedido.tipo(), null, comanda.id(), null, ator.participanteId());
        return repository.solicitacao(id);
    }

    @Transactional
    public List<SolicitacaoMesa> listar(IdentidadeAtual ator, UUID unidade, int pagina) {
        MesaService.pagina(pagina);
        acessos.autorizarOperacaoExistente(ator, Acao.MESA_ATENDER, unidade);
        return repository.solicitacoes(unidade, pagina);
    }

    @Transactional
    public SolicitacaoMesa atender(IdentidadeAtual ator, UUID id, long versao) {
        var referencia = repository.solicitacao(id);
        if (referencia == null) throw ErrosMesa.inexistente();
        var contexto = comandas.consultar(referencia.comandaId());
        acessos.autorizarOperacaoExistente(ator, Acao.MESA_ATENDER, contexto.unidadeId());
        comandas.bloquear(contexto.id());
        var atual = repository.solicitacao(id);
        if (atual.estado().equals("ATENDIDA")) return atual;
        if (atual.versao() != versao) throw ErrosMesa.conflito("A solicitação mudou. Recarregue antes de continuar.");
        repository.atender(id, ator.usuarioId());
        repository.auditar(ator.usuarioId(), id, "SOLICITACAO_MESA_ATENDIDA", "PENDENTE", "ATENDIDA");
        eventos.registrar(contexto.unidadeId(), "MESA_SOLICITACAO_ATENDIDA", null, contexto.id(), null, repository.autorSolicitacao(id));
        return repository.solicitacao(id);
    }
}
