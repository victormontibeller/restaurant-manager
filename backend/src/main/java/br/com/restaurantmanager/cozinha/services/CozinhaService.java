package br.com.restaurantmanager.cozinha.services;

import br.com.restaurantmanager.pedidos.dtos.PedidoOperacional;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.PaginaPedidos;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.pedidos.models.OrdenacaoPedidos;
import br.com.restaurantmanager.pedidos.services.PedidoComandoService;
import br.com.restaurantmanager.pedidos.services.PedidoConsultaService;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import br.com.restaurantmanager.cozinha.dtos.CartaoCozinha;
import br.com.restaurantmanager.cozinha.dtos.GrupoCozinha;
import br.com.restaurantmanager.cozinha.dtos.PainelCozinha;
import br.com.restaurantmanager.cozinha.repositories.CozinhaPainelRepository;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.unidades.services.FuncionamentoUnidadeService;
import java.time.Instant;
import java.util.List;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CozinhaService {
    private final PedidoConsultaService consultas;
    private final PedidoComandoService comandos;

    private final CozinhaPainelRepository painel;
    private final AcessosService acessos;
    private final FuncionamentoUnidadeService funcionamento;

    public CozinhaService(PedidoConsultaService consultas, PedidoComandoService comandos,
            CozinhaPainelRepository painel, AcessosService acessos, FuncionamentoUnidadeService funcionamento) {
        this.consultas = consultas;
        this.comandos = comandos;
        this.painel = painel;
        this.acessos = acessos;
        this.funcionamento = funcionamento;
    }

    public PaginaPedidos<PedidoOperacional> listar(IdentidadeAtual ator, UUID unidade, int pagina,
            List<EstadoPedido> estados, CanalAtendimento canal, OrdenacaoPedidos ordenacao) {
        return consultas.listarOperacao(ator, unidade, pagina, true, estados, canal, ordenacao);
    }

    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public PainelCozinha painel(IdentidadeAtual ator, UUID unidade, CanalAtendimento canal,
            int paginaFila, int paginaPreparo, int paginaProntos, int paginaAnteriores) {
        for (int pagina : new int[]{paginaFila, paginaPreparo, paginaProntos, paginaAnteriores}) {
            if (pagina < 0 || pagina > 10000) throw ErrosPedido.regra("Página inválida.");
        }
        acessos.autorizarOperacaoExistente(ator, Acao.PEDIDO_CONSULTAR, unidade);
        var fuso = funcionamento.fusoOperacional(unidade);
        Instant agora = Instant.now();
        Instant inicio = agora.atZone(fuso).toLocalDate().atStartOfDay(fuso).toInstant();
        return new PainelCozinha(agora, fuso.getId(),
                grupo(ator, unidade, canal, "NA_FILA", null, inicio, paginaFila),
                grupo(ator, unidade, canal, "EM_PREPARO", null, inicio, paginaPreparo),
                grupo(ator, unidade, canal, "PRONTO", false, inicio, paginaProntos),
                grupo(ator, unidade, canal, "PRONTO", true, inicio, paginaAnteriores));
    }

    private GrupoCozinha grupo(IdentidadeAtual ator, UUID unidade, CanalAtendimento canal,
            String estado, Boolean anteriores, Instant inicio, int pagina) {
        long total = painel.total(unidade, canal, estado, anteriores, inicio);
        var itens = painel.pagina(unidade, canal, estado, anteriores, inicio, pagina).stream()
                .map(row -> new CartaoCozinha(consultas.operacional(ator, (UUID) row[0]),
                        (String) row[1], CozinhaPainelRepository.instante(row[2])))
                .toList();
        return new GrupoCozinha(itens, total, (long) (pagina + 1) * 50 < total);
    }

    public PedidoOperacional produzir(IdentidadeAtual ator, UUID pedido, String acao, ComandoPedido comando) {
        return comandos.operacional(ator, pedido, acao, comando, null).pedido();
    }
}
