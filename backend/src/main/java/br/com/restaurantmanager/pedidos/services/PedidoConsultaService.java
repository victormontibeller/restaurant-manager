package br.com.restaurantmanager.pedidos.services;

import br.com.restaurantmanager.pedidos.dtos.AdicionalPreparo;
import br.com.restaurantmanager.pedidos.dtos.EscolhaPreparo;
import br.com.restaurantmanager.pedidos.dtos.LinhaPreparo;
import br.com.restaurantmanager.pedidos.dtos.PedidoOperacional;
import br.com.restaurantmanager.financeiro.services.CobrancaService;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.mesas.services.MesaSessaoService;
import br.com.restaurantmanager.pedidos.dtos.PaginaPedidos;
import br.com.restaurantmanager.pedidos.dtos.PedidoDetalhe;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.models.PedidoRegistro;
import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PedidoConsultaService {
    private final PedidoRepository repository;
    private final PedidoAcessoService acesso;
    private final AcessosService acessos;
    private final MesaSessaoService sessoes;
    private final CobrancaService cobrancas;

    public PedidoConsultaService(PedidoRepository repository, PedidoAcessoService acesso, AcessosService acessos,
            MesaSessaoService sessoes, CobrancaService cobrancas) {
        this.repository = repository;
        this.acesso = acesso;
        this.acessos = acessos;
        this.sessoes = sessoes;
        this.cobrancas = cobrancas;
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PedidoDetalhe cliente(IdentidadeAtual ator, UUID id) {
        return detalhe(acesso.cliente(ator, id, false));
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PedidoDetalhe participante(ParticipanteAtual ator, UUID id) {
        return detalhe(acesso.participante(ator, id, false));
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PedidoOperacional operacional(IdentidadeAtual ator, UUID id) {
        return operacional(acesso.operacao(ator, id, Acao.PEDIDO_CONSULTAR, false));
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PaginaPedidos<PedidoDetalhe> listarCliente(IdentidadeAtual ator, int pagina) {
        pagina(pagina);
        acessos.autorizarCliente(ator);
        var ids = repository.listar(null, ator.usuarioId(), null, pagina, false);
        return new PaginaPedidos<>(ids.stream().limit(50).map(id -> detalhe(acesso.obter(id))).toList(), ids.size() > 50);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PaginaPedidos<PedidoDetalhe> listarParticipante(ParticipanteAtual ator, int pagina) {
        pagina(pagina);
        acessos.bloquearPoliticaOperacional();
        sessoes.validar(ator);
        var ids = repository.listar(null, null, ator.participanteId(), pagina, false);
        return new PaginaPedidos<>(ids.stream().limit(50).map(id -> detalhe(acesso.obter(id))).toList(), ids.size() > 50);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PaginaPedidos<PedidoOperacional> listarOperacao(IdentidadeAtual ator, UUID unidade, int pagina, boolean cozinha) {
        pagina(pagina);
        acessos.autorizarOperacaoExistente(ator, Acao.PEDIDO_CONSULTAR, unidade);
        var ids = repository.listar(unidade, null, null, pagina, cozinha);
        return new PaginaPedidos<>(ids.stream().limit(50).map(id -> operacional(acesso.obter(id))).toList(), ids.size() > 50);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public boolean existePendenteComanda(UUID comanda) {
        return repository.existePendenteComanda(comanda);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public PedidoDetalhe detalhe(PedidoRegistro pedido) {
        return new PedidoDetalhe(pedido.id(), pedido.unidadeId(), pedido.comandaId(), pedido.canal(), pedido.estado(),
                pedido.versao(), pedido.criadoEm(), pedido.primeiroPreparoEm(), pedido.alertarEm(), pedido.expirarEm(),
                pedido.observacao(), pedido.linhas(), repository.unidades(pedido.id()), repository.historico(pedido.id()),
                repository.solicitacoes(pedido.id()), cobrancas.saldoPedido(pedido.id(), pedido.comandaId()));
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public PedidoOperacional operacional(PedidoRegistro pedido) {
        var linhas = pedido.linhas().stream().map(linha -> new LinhaPreparo(linha.id(), linha.nome(), linha.tipo().name(),
                linha.quantidade(), linha.adicionais().stream().map(a -> new AdicionalPreparo(a.nome(), a.quantidade())).toList(),
                linha.escolhas().stream().map(e -> new EscolhaPreparo(e.grupo(), e.nome(), e.quantidade(),
                        e.adicionais().stream().map(a -> new AdicionalPreparo(a.nome(), a.quantidade())).toList())).toList())).toList();
        return new PedidoOperacional(pedido.id(), pedido.unidadeId(), pedido.comandaId(), pedido.canal(), pedido.estado(),
                pedido.versao(), pedido.criadoEm(), pedido.primeiroPreparoEm(), pedido.alertarEm(), pedido.expirarEm(),
                pedido.observacao(), linhas, repository.unidades(pedido.id()), repository.historico(pedido.id()), repository.solicitacoes(pedido.id()));
    }

    private void pagina(int pagina) {
        if (pagina < 0 || pagina > 10000) throw ErrosPedido.regra("Página inválida.");
    }
}
