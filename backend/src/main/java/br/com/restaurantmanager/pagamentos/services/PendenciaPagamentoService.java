package br.com.restaurantmanager.pagamentos.services;

import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.pagamentos.dtos.PendenciaPagamento;
import br.com.restaurantmanager.pagamentos.repositories.PendenciaPagamentoRepository;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.services.PedidoAcessoService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@Transactional(timeout = 20)
public class PendenciaPagamentoService {
    private final PendenciaPagamentoRepository repository;
    private final AcessosService acessos;
    private final PedidoAcessoService pedidos;

    public PendenciaPagamentoService(
            PendenciaPagamentoRepository repository,
            AcessosService acessos,
            PedidoAcessoService pedidos) {
        this.repository = repository;
        this.acessos = acessos;
        this.pedidos = pedidos;
    }

    public List<PendenciaPagamento> listar(IdentidadeAtual ator, UUID unidade, int pagina) {
        acessos.autorizarOperacaoExistente(ator, Acao.PAGAMENTO_RECONCILIAR, unidade);
        if (pagina < 0 || pagina > 10000) throw ErrosPedido.regra("Página inválida.");
        return repository.listar(unidade, pagina);
    }

    public void reconciliar(IdentidadeAtual ator, UUID id, boolean devolucao) {
        UUID pedido = repository.pedido(id, devolucao);
        var p = pedidos.operacao(ator, pedido, Acao.PAGAMENTO_RECONCILIAR, true);
        repository.reconciliar(id, devolucao);
        acessos.auditarOperacao(
                ator,
                Acao.PAGAMENTO_RECONCILIAR,
                p.unidadeId(),
                id,
                "PAGAMENTO_RECONCILIACAO_SOLICITADA");
    }
}
