package br.com.restaurantmanager.financeiro.services;

import br.com.restaurantmanager.catalogo.models.Dinheiro;
import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.financeiro.dtos.ConfirmarDevolucao;
import br.com.restaurantmanager.financeiro.dtos.DetalheFinanceiro;
import br.com.restaurantmanager.financeiro.dtos.EntradaAjuste;
import br.com.restaurantmanager.financeiro.dtos.EntradaDevolucao;
import br.com.restaurantmanager.financeiro.dtos.EntradaRecebimento;
import br.com.restaurantmanager.financeiro.dtos.ReferenciaCobranca;
import br.com.restaurantmanager.financeiro.repositories.CobrancaRepository;
import br.com.restaurantmanager.financeiro.repositories.MovimentoFinanceiroRepository;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.services.ComandaService;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.services.PedidoAcessoService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(timeout = 20)
public class MovimentoFinanceiroService {
    private final MovimentoFinanceiroRepository repository;
    private final CobrancaRepository cobrancas;
    private final CobrancaService saldos;
    private final AcessosService acessos;
    private final PedidoAcessoService pedidos;
    private final ComandaService comandas;
    private final EventoOperacionalService eventos;

    public MovimentoFinanceiroService(
            MovimentoFinanceiroRepository repository,
            CobrancaRepository cobrancas,
            CobrancaService saldos,
            AcessosService acessos,
            PedidoAcessoService pedidos,
            ComandaService comandas,
            EventoOperacionalService eventos) {
        this.repository = repository;
        this.cobrancas = cobrancas;
        this.saldos = saldos;
        this.acessos = acessos;
        this.pedidos = pedidos;
        this.comandas = comandas;
        this.eventos = eventos;
    }

    public DetalheFinanceiro consultar(IdentidadeAtual ator, UUID recurso, boolean comanda) {
        var acoes = acessos.efetivo(ator).acoes();
        Acao acao =
                List.of(Acao.RECEBER, Acao.AJUSTAR, Acao.DEVOLVER, Acao.FECHAMENTO_CONCLUIR)
                        .stream()
                        .filter(a -> acoes.contains(a.codigo()))
                        .findFirst()
                        .orElseThrow(() -> new AuthFailure(403, "ACESSO_NEGADO", "Acesso negado."));
        if (comanda) {
            var contexto = comandas.bloquear(recurso);
            acessos.autorizarOperacaoExistente(ator, acao, contexto.unidadeId());
            if (cobrancas.localizar(null, recurso).isEmpty()) {
                return new DetalheFinanceiro(
                        null,
                        saldos.saldoComanda(recurso),
                        "0.00",
                        List.of(),
                        List.of(),
                        List.of());
            }
        }
        return detalhe(bloquear(ator, recurso, comanda, acao));
    }

    public DetalheFinanceiro receber(
            IdentidadeAtual ator, UUID recurso, boolean comanda, EntradaRecebimento body) {
        var ref = preparar(ator, recurso, comanda, Acao.RECEBER, body.intencaoId());
        if (repository.repetida(body.intencaoId(), ref.id(), ator.usuarioId(), "RECEBER", body))
            return detalhe(ref);
        BigDecimal valor = positivo(body.valor());
        BigDecimal entregue = body.entregue() == null ? valor : Dinheiro.ler(body.entregue());
        if (!List.of("DINHEIRO", "CARTAO", "PIX").contains(body.metodo()))
            throw ErrosPedido.regra("Meio de recebimento inválido.");
        if (entregue.compareTo(valor) < 0
                || (!body.metodo().equals("DINHEIRO") && entregue.compareTo(valor) != 0)) {
            throw ErrosPedido.regra("Confira o valor entregue e o meio de recebimento.");
        }
        var saldo = detalhe(ref);
        if (saldo.saldo().pendenciaFinanceira()
                || valor.compareTo(new BigDecimal(saldo.saldo().saldoAReceber())) > 0) {
            throw ErrosPedido.conflito(
                    "O valor ultrapassa o saldo ou existe uma operação financeira pendente.");
        }
        registrar(ator, ref, body.intencaoId(), "RECEBER", body);
        repository.receber(body.intencaoId(), ref.id(), body.metodo(), valor, entregue);
        evento(ref, "RECEBIMENTO_CONFIRMADO", body.intencaoId());
        return detalhe(ref);
    }

    public DetalheFinanceiro ajustar(
            IdentidadeAtual ator, UUID recurso, boolean comanda, EntradaAjuste body) {
        var ref = preparar(ator, recurso, comanda, Acao.AJUSTAR, body.intencaoId());
        if (repository.repetida(body.intencaoId(), ref.id(), ator.usuarioId(), "AJUSTAR", body))
            return detalhe(ref);
        String motivo = ErrosPedido.motivo(body.motivo());
        var parcelas = repository.parcelas(ref.id());
        var ids = new HashSet<UUID>();
        for (var alocacao : body.alocacoes()) {
            var parcela =
                    parcelas.stream()
                            .filter(p -> p.id().equals(alocacao.parcelaId()))
                            .findFirst()
                            .orElseThrow(ErrosPedido::inexistente);
            BigDecimal valor = positivo(alocacao.valor());
            if (!ids.add(parcela.id())
                    || valor.compareTo(
                                    new BigDecimal(parcela.original())
                                            .subtract(new BigDecimal(parcela.abatido())))
                            > 0) {
                throw ErrosPedido.conflito(
                        "A alocação excede o valor remanescente ou repete uma parcela.");
            }
        }
        registrar(ator, ref, body.intencaoId(), "AJUSTAR", body);
        for (var alocacao : body.alocacoes())
            repository.ajustar(
                    body.intencaoId(), alocacao.parcelaId(), positivo(alocacao.valor()), motivo);
        evento(ref, "COBRANCA_AJUSTADA", body.intencaoId());
        return detalhe(ref);
    }

    public DetalheFinanceiro devolver(
            IdentidadeAtual ator, UUID recurso, boolean comanda, EntradaDevolucao body) {
        var ref = preparar(ator, recurso, comanda, Acao.DEVOLVER, body.intencaoId());
        if (repository.repetida(body.intencaoId(), ref.id(), ator.usuarioId(), "DEVOLVER", body))
            return detalhe(ref);
        String motivo = ErrosPedido.motivo(body.motivo());
        BigDecimal valor = positivo(body.valor());
        var recebimento =
                repository.recebimentos(ref.id()).stream()
                        .filter(r -> r.id().equals(body.recebimentoId()))
                        .findFirst()
                        .orElseThrow(ErrosPedido::inexistente);
        BigDecimal comprometido =
                repository.devolucoes(ref.id()).stream()
                        .filter(d -> d.recebimentoId().equals(recebimento.id()))
                        .map(d -> new BigDecimal(d.valor()))
                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        var saldo = detalhe(ref);
        BigDecimal disponivel =
                new BigDecimal(saldo.saldo().saldoADevolver())
                        .subtract(new BigDecimal(saldo.reservado()));
        if (valor.compareTo(disponivel) > 0
                || valor.compareTo(new BigDecimal(recebimento.valor()).subtract(comprometido))
                        > 0) {
            throw ErrosPedido.conflito(
                    "A devolução excede o saldo disponível. Ajuste a cobrança quando houver"
                            + " abatimento comercial.");
        }
        registrar(ator, ref, body.intencaoId(), "DEVOLVER", body);
        repository.devolver(body.intencaoId(), ref.id(), recebimento.id(), valor, motivo);
        evento(ref, "DEVOLUCAO_SOLICITADA", body.intencaoId());
        return detalhe(ref);
    }

    public DetalheFinanceiro confirmar(
            IdentidadeAtual ator,
            UUID recurso,
            boolean comanda,
            UUID devolucao,
            ConfirmarDevolucao body) {
        String acao = "CONFIRMAR_DEVOLUCAO";
        // O identificador do alvo também integra o payload idempotente.
        var payload = List.of(devolucao, body.intencaoId());
        var ref = preparar(ator, recurso, comanda, Acao.DEVOLVER, body.intencaoId());
        if (repository.repetida(body.intencaoId(), ref.id(), ator.usuarioId(), acao, payload))
            return detalhe(ref);
        var alvo =
                repository.devolucoes(ref.id()).stream()
                        .filter(d -> d.id().equals(devolucao))
                        .findFirst()
                        .orElseThrow(ErrosPedido::inexistente);
        if (!alvo.estado().equals("SOLICITADA"))
            throw ErrosPedido.conflito("A devolução já foi confirmada.");
        boolean online =
                repository.recebimentos(ref.id()).stream()
                        .anyMatch(
                                r ->
                                        r.id().equals(alvo.recebimentoId())
                                                && r.metodo().equals("ONLINE"));
        if (online) throw ErrosPedido.regra("Devoluções online exigem confirmação do provedor.");
        registrar(ator, ref, body.intencaoId(), acao, payload);
        repository.confirmar(devolucao, ref.id(), new BigDecimal(alvo.valor()));
        evento(ref, "DEVOLUCAO_CONFIRMADA", body.intencaoId());
        return detalhe(ref);
    }

    private ReferenciaCobranca preparar(
            IdentidadeAtual ator, UUID recurso, boolean comanda, Acao acao, UUID intencao) {
        // A intenção vem antes de política/agregado em todos os comandos.
        repository.bloquearIntencao(intencao);
        return bloquear(ator, recurso, comanda, acao);
    }

    private ReferenciaCobranca bloquear(
            IdentidadeAtual ator, UUID recurso, boolean comanda, Acao acao) {
        var ref = repository.referencia(recurso, comanda);
        acessos.autorizarOperacaoExistente(ator, acao, ref.unidadeId());
        if (comanda) comandas.bloquear(recurso);
        else pedidos.operacao(ator, recurso, acao, true);
        acessos.autorizarOperacaoExistente(ator, acao, ref.unidadeId());
        cobrancas.saldo(ref.id(), true);
        return ref;
    }

    private DetalheFinanceiro detalhe(ReferenciaCobranca ref) {
        var saldo =
                ref.comandaId() == null
                        ? saldos.saldoPedido(ref.pedidoId(), null)
                        : saldos.saldoComanda(ref.comandaId());
        return new DetalheFinanceiro(
                ref.id(),
                saldo,
                Dinheiro.texto(repository.reservado(ref.id())),
                repository.parcelas(ref.id()),
                repository.recebimentos(ref.id()),
                repository.devolucoes(ref.id()));
    }

    private BigDecimal positivo(String texto) {
        BigDecimal valor = Dinheiro.ler(texto);
        if (valor.signum() <= 0) throw ErrosPedido.regra("Informe um valor maior que zero.");
        return valor;
    }

    private void registrar(
            IdentidadeAtual ator, ReferenciaCobranca ref, UUID id, String acao, Object body) {
        repository.intencao(id, ref.id(), ator.usuarioId(), acao, body);
    }

    private void evento(ReferenciaCobranca ref, String tipo, UUID referencia) {
        UUID cliente = ref.pedidoId() == null ? null : pedidos.obter(ref.pedidoId()).usuarioId();
        eventos.registrar(
                ref.unidadeId(), tipo, ref.pedidoId(), ref.comandaId(), cliente, null, referencia);
    }
}
