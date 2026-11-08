package br.com.restaurantmanager.mesas.services;

import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.financeiro.services.CobrancaService;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.dtos.ContextoComanda;
import br.com.restaurantmanager.mesas.dtos.ResumoComanda;
import br.com.restaurantmanager.mesas.exceptions.ErrosMesa;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.mesas.repositories.MesaRepository;
import br.com.restaurantmanager.pedidos.services.PedidoConsultaService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FechamentoComandaService {
    private static final List<Acao> CONSULTA_FINANCEIRA = List.of(Acao.FECHAMENTO_INICIAR, Acao.FECHAMENTO_CONCLUIR, Acao.RECEBER, Acao.AJUSTAR);
    private final MesaRepository repository;
    private final ComandaService comandas;
    private final AcessosService acessos;
    private final MesaSessaoService sessoes;
    private final CobrancaService cobrancas;
    private final PedidoConsultaService pedidos;
    private final EventoOperacionalService eventos;

    public FechamentoComandaService(MesaRepository repository, ComandaService comandas, AcessosService acessos,
            MesaSessaoService sessoes, CobrancaService cobrancas, PedidoConsultaService pedidos, EventoOperacionalService eventos) {
        this.repository = repository;
        this.comandas = comandas;
        this.acessos = acessos;
        this.sessoes = sessoes;
        this.cobrancas = cobrancas;
        this.pedidos = pedidos;
        this.eventos = eventos;
    }

    @Transactional
    public ResumoComanda consultar(IdentidadeAtual ator, UUID id) {
        var referencia = comandas.consultar(id);
        var acoes = acessos.efetivo(ator).acoes();
        var acao = CONSULTA_FINANCEIRA.stream().filter(a -> acoes.contains(a.codigo())).findFirst()
                .orElseThrow(() -> new AuthFailure(403, "ACESSO_NEGADO", "Acesso negado."));
        acessos.autorizarOperacaoExistente(ator, acao, referencia.unidadeId());
        return resumo(comandas.bloquear(id));
    }

    @Transactional
    public ResumoComanda consultarParticipante(ParticipanteAtual ator) {
        acessos.bloquearPoliticaOperacional();
        var comanda = comandas.bloquear(ator.comandaId());
        sessoes.validar(ator);
        return resumo(comanda);
    }

    @Transactional
    public ResumoComanda alterar(IdentidadeAtual ator, UUID id, long versao, String comando) {
        Acao acao = switch (comando) {
            case "iniciar-fechamento" -> Acao.FECHAMENTO_INICIAR;
            case "reabrir" -> Acao.FECHAMENTO_REABRIR;
            case "concluir" -> Acao.FECHAMENTO_CONCLUIR;
            default -> throw ErrosMesa.inexistente();
        };
        var referencia = comandas.consultar(id);
        acessos.autorizarOperacaoExistente(ator, acao, referencia.unidadeId());
        var comanda = comandas.bloquear(id);
        acessos.autorizarOperacaoExistente(ator, acao, comanda.unidadeId());
        String destino = switch (comando) {
            case "iniciar-fechamento" -> "EM_FECHAMENTO";
            case "reabrir" -> "ABERTA";
            default -> "FECHADA";
        };
        if (comanda.estado().equals(destino)) return resumo(comanda);
        if (comanda.versao() != versao) throw ErrosMesa.conflito("A comanda mudou. Recarregue antes de continuar.");
        if (comanda.estado().equals("FECHADA")) throw ErrosMesa.conflito("A comanda está encerrada. Abra um novo atendimento.");
        if (comando.equals("reabrir") && cobrancas.saldoComanda(id).recebeu()) {
            throw ErrosMesa.conflito("A comanda não pode reabrir após recebimento confirmado.");
        }
        if (comando.equals("concluir")) {
            if (!comanda.estado().equals("EM_FECHAMENTO")) throw ErrosMesa.conflito("Inicie o fechamento antes de concluir.");
            if (pedidos.existePendenteComanda(id)) throw ErrosMesa.conflito("Há pedidos ainda não servidos ou resolvidos.");
            if (!cobrancas.saldoComanda(id).podeFechar()) throw ErrosMesa.conflito("Há saldo ou pendência financeira nesta comanda.");
        }
        repository.estado(id, destino);
        if (destino.equals("FECHADA")) repository.encerrar(comanda.atendimentoId(), Instant.now());
        repository.auditar(ator.usuarioId(), id, "COMANDA_ESTADO", comanda.estado(), destino);
        eventos.registrar(comanda.unidadeId(), "COMANDA_" + destino, null, id, null, null);
        return resumo(comandas.consultar(id));
    }

    private ResumoComanda resumo(ContextoComanda comanda) {
        var mesa = repository.mesaDaComanda(comanda.id());
        var saldo = cobrancas.saldoComanda(comanda.id());
        return new ResumoComanda(comanda.id(), comanda.unidadeId(), comanda.atendimentoId(), mesa.id(), mesa.nome(),
                comanda.estado(), comanda.versao(), saldo.totalDevido(), saldo.pagoConfirmado(), saldo.devolvidoConfirmado(),
                saldo.saldoAReceber(), saldo.saldoADevolver(), saldo.pendenciaFinanceira());
    }
}
