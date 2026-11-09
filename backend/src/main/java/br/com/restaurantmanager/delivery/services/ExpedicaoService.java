package br.com.restaurantmanager.delivery.services;

import br.com.restaurantmanager.delivery.dtos.ComandoOcorrencia;
import br.com.restaurantmanager.delivery.dtos.PedidoExpedicao;
import br.com.restaurantmanager.delivery.repositories.ExpedicaoRepository;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.pedidos.dtos.PaginaPedidos;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.pedidos.models.PedidoRegistro;
import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;
import br.com.restaurantmanager.pedidos.services.PedidoAcessoService;
import br.com.restaurantmanager.pedidos.services.PedidoConsultaService;
import br.com.restaurantmanager.pedidos.services.PedidoFluxoService;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@Transactional(timeout = 20)
public class ExpedicaoService {
    private final ExpedicaoRepository repository;
    private final PedidoRepository pedidos;
    private final PedidoAcessoService acesso;
    private final PedidoConsultaService consultas;
    private final PedidoFluxoService fluxo;
    private final AcessosService acessos;

    public ExpedicaoService(
            ExpedicaoRepository repository,
            PedidoRepository pedidos,
            PedidoAcessoService acesso,
            PedidoConsultaService consultas,
            PedidoFluxoService fluxo,
            AcessosService acessos) {
        this.repository = repository;
        this.pedidos = pedidos;
        this.acesso = acesso;
        this.consultas = consultas;
        this.fluxo = fluxo;
        this.acessos = acessos;
    }

    public PaginaPedidos<PedidoExpedicao> listar(IdentidadeAtual ator, UUID unidade, int pagina) {
        var efetivas = acessos.efetivo(ator).acoes();
        Acao acao =
                List.of(
                                Acao.PEDIDO_RETIRAR,
                                Acao.PEDIDO_DESPACHAR,
                                Acao.PEDIDO_ENTREGAR,
                                Acao.ENTREGA_OCORRENCIA,
                                Acao.ENTREGA_DECIDIR)
                        .stream()
                        .filter(a -> efetivas.contains(a.codigo()))
                        .findFirst()
                        .orElseThrow(() -> new AuthFailure(403, "ACESSO_NEGADO", "Acesso negado."));
        acessos.autorizarOperacaoExistente(ator, acao, unidade);
        if (pagina < 0 || pagina > 10000) throw ErrosPedido.regra("Página inválida.");
        var ids = pedidos.listarExpedicao(unidade, pagina);
        return new PaginaPedidos<>(
                ids.stream().limit(50).map(id -> detalhe(acesso.obter(id))).toList(),
                ids.size() > 50);
    }

    public PedidoExpedicao ocorrencia(
            IdentidadeAtual ator, UUID id, boolean resolver, ComandoOcorrencia body) {
        pedidos.bloquearIntencao(body.intencaoId());
        var pedido =
                acesso.operacao(
                        ator, id, resolver ? Acao.ENTREGA_DECIDIR : Acao.ENTREGA_OCORRENCIA, true);
        String acao = resolver ? "DECIDIR_ENTREGA" : "OCORRENCIA_ENTREGA";
        var anterior = pedidos.comando(body.intencaoId());
        if (anterior.isPresent()) {
            Object[] r = anterior.get();
            if (!id.equals(r[0])
                    || !ator.usuarioId().equals(r[1])
                    || !acao.equals(r[2])
                    || !pedidos.json(body).equals(r[3]))
                throw ErrosPedido.conflito("Esta intenção já foi utilizada com outros dados.");
            return detalhe(pedido);
        }
        if (pedido.versao() != body.versao()
                || pedido.canal() != CanalAtendimento.DELIVERY
                || pedido.estado() != EstadoPedido.EM_ENTREGA) {
            throw ErrosPedido.conflito(
                    "O pedido mudou ou não está em entrega. Recarregue antes de continuar.");
        }
        String motivo = ErrosPedido.motivo(body.motivo());
        var atual = repository.ocorrencia(id);
        if (resolver) {
            if (atual == null || !atual.estado().equals("PENDENTE"))
                throw ErrosPedido.conflito("Não há ocorrência aguardando decisão.");
            if (!List.of("NOVA_TENTATIVA", "CANCELAMENTO")
                    .contains(body.decisao() == null ? "" : body.decisao()))
                throw ErrosPedido.regra("Escolha nova tentativa ou cancelamento.");
            if (body.decisao().equals("CANCELAMENTO")) {
                if (body.devolverTaxa() == null)
                    throw ErrosPedido.regra("Informe explicitamente se a taxa será devolvida.");
                fluxo.cancelarEntrega(
                        pedido,
                        body.intencaoId(),
                        ator.usuarioId(),
                        motivo,
                        Instant.now(),
                        body.devolverTaxa());
            } else
                fluxo.alterar(
                        pedido,
                        EstadoPedido.EM_ENTREGA,
                        null,
                        ator.usuarioId(),
                        "ENTREGA_NOVA_TENTATIVA",
                        motivo,
                        Instant.now());
            repository.decidir(id, body.decisao(), body.devolverTaxa(), motivo);
        } else {
            if (atual != null && atual.estado().equals("PENDENTE"))
                throw ErrosPedido.conflito("Já existe ocorrência aguardando decisão.");
            repository.registrar(id, motivo);
            fluxo.alterar(
                    pedido,
                    EstadoPedido.EM_ENTREGA,
                    null,
                    ator.usuarioId(),
                    "ENTREGA_OCORRENCIA",
                    motivo,
                    Instant.now());
        }
        pedidos.comando(body.intencaoId(), id, ator.usuarioId(), acao, pedidos.json(body));
        return detalhe(acesso.obter(id));
    }

    private PedidoExpedicao detalhe(PedidoRegistro pedido) {
        return new PedidoExpedicao(
                consultas.operacional(pedido),
                repository.endereco(pedido.id()),
                repository.entrega(pedido.id()),
                repository.ocorrencia(pedido.id()));
    }
}
