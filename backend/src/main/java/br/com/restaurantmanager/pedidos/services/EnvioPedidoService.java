package br.com.restaurantmanager.pedidos.services;

import br.com.restaurantmanager.carrinho.dtos.Calcular;
import br.com.restaurantmanager.carrinho.services.CarrinhoService;
import br.com.restaurantmanager.eventos.services.EventoOperacionalService;
import br.com.restaurantmanager.financeiro.services.CobrancaService;
import br.com.restaurantmanager.financeiro.dtos.ParcelaInicial;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.mesas.services.ComandaService;
import br.com.restaurantmanager.mesas.services.MesaSessaoService;
import br.com.restaurantmanager.pedidos.dtos.EnviarPedido;
import br.com.restaurantmanager.pedidos.dtos.PedidoDetalhe;
import br.com.restaurantmanager.pedidos.dtos.PedidoOperacional;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.models.PedidoRegistro;
import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;
import br.com.restaurantmanager.tenancy.services.TenantService;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EnvioPedidoService {
    private final PedidoRepository repository;
    private final AcessosService acessos;
    private final TenantService tenants;
    private final CarrinhoService carrinho;
    private final ComandaService comandas;
    private final MesaSessaoService sessoes;
    private final CobrancaService cobrancas;
    private final PrazosAceiteService prazos;
    private final PedidoConsultaService consultas;
    private final EventoOperacionalService eventos;
    private final Clock clock;
    private final PedidoDeadlineService deadlines;
    private final boolean deliveryControlado;

    public EnvioPedidoService(PedidoRepository repository, AcessosService acessos, TenantService tenants,
            CarrinhoService carrinho, ComandaService comandas, MesaSessaoService sessoes, CobrancaService cobrancas,
            PrazosAceiteService prazos, PedidoConsultaService consultas, EventoOperacionalService eventos, PedidoDeadlineService deadlines,
            @Qualifier("pedidosClock") Clock clock,
            @Value("${rm.pedidos.delivery-controlado:false}") boolean deliveryControlado,
            @Value("${rm.stage:dev}") String ambiente) {
        this.repository = repository;
        this.acessos = acessos;
        this.tenants = tenants;
        this.carrinho = carrinho;
        this.comandas = comandas;
        this.sessoes = sessoes;
        this.cobrancas = cobrancas;
        this.prazos = prazos;
        this.consultas = consultas;
        this.eventos = eventos;
        this.clock = clock;
        this.deadlines = deadlines;
        this.deliveryControlado = deliveryControlado && List.of("dev", "test").contains(ambiente);
    }

    @Transactional(timeout = 20)
    public PedidoDetalhe cliente(IdentidadeAtual ator, EnviarPedido entrada) {
        return consultas.detalhe(enviar(ator, null, entrada, false));
    }

    @Transactional(timeout = 20)
    public PedidoOperacional assistido(IdentidadeAtual ator, EnviarPedido entrada) {
        return consultas.operacional(enviar(ator, null, entrada, true));
    }

    @Transactional(timeout = 20)
    public PedidoDetalhe participante(ParticipanteAtual ator, EnviarPedido entrada) {
        return consultas.detalhe(enviar(null, ator, entrada, false));
    }

    private PedidoRegistro enviar(IdentidadeAtual ator, ParticipanteAtual participante, EnviarPedido entrada, boolean assistido) {
        // A intenção serializa retries antes de qualquer nova persistência. Replay
        // recupera uma compra existente mesmo que a empresa já tenha suspendido vendas.
        repository.bloquearIntencao(entrada.intencaoId());
        String payload = repository.json(entrada);
        PedidoRegistro existente = repository.consultar(entrada.intencaoId(), false).orElse(null);
        if (existente != null) {
            autorizar(ator, participante, entrada, assistido, true);
            boolean mesmoAtor = participante == null
                    ? ator.usuarioId().equals(existente.usuarioId()) && existente.autoria().equals(assistido ? "FUNCIONARIO" : "CLIENTE")
                    : participante.participanteId().equals(existente.participanteId());
            if (!mesmoAtor || !payload.equals(existente.payload())) throw ErrosPedido.conflito("Esta intenção já foi utilizada com outros dados.");
            // A resposta inclui unidades, histórico e saldo. Releia o agregado sob
            // os mesmos locks das mutações para não misturar versões no replay.
            if (existente.comandaId() != null) comandas.bloquear(existente.comandaId());
            PedidoRegistro atual = repository.consultar(existente.id(), true).orElseThrow(ErrosPedido::inexistente);
            autorizar(ator, participante, entrada, assistido, true);
            return atual;
        }

        tenants.exigirNovasOperacoes();
        autorizar(ator, participante, entrada, assistido, false);
        validarCanal(entrada, participante, assistido);
        carrinho.bloquearParaPedido();
        if (entrada.comandaId() != null) {
            var comanda = comandas.bloquear(entrada.comandaId());
            if (!comanda.unidadeId().equals(entrada.unidadeId())) throw ErrosPedido.inexistente();
            comandas.exigirAberta(comanda);
        }
        // Sessão e autorização são novamente lidas depois de esperar catálogo/comanda.
        autorizar(ator, participante, entrada, assistido, false);
        var resumo = carrinho.calcularParaPedido(new Calcular(entrada.unidadeId(), entrada.canal(), entrada.linhas(), entrada.revisao()));
        if (resumo.requerConfirmacao()) throw ErrosPedido.conflito("O catálogo ou o funcionamento mudou. Recalcule e confirme o novo resumo.");
        Instant agora = clock.instant();
        var prazo = prazos.paraEntrada(entrada.unidadeId());
        repository.criar(entrada, ator == null ? null : ator.usuarioId(), participante == null ? null : participante.participanteId(),
                participante != null ? "PARTICIPANTE" : assistido ? "FUNCIONARIO" : "CLIENTE", resumo.linhas(),
                agora, prazo.alertaSegundos(), prazo.expiracaoSegundos(), payload);
        if (entrada.canal() != CanalAtendimento.MESA) deadlines.agendar(entrada.intencaoId(), agora.plusSeconds(prazo.alertaSegundos()));
        // Frete gratuito explicitamente controlado; regras comerciais de entrega são Sprint 4.
        var parcelas = repository.unidades(entrada.intencaoId()).stream().map(unidade -> {
            var linha = resumo.linhas().stream().filter(l -> l.id().equals(unidade.linhaId())).findFirst().orElseThrow();
            return new ParcelaInicial(unidade.id(), new BigDecimal(linha.precoUnitario()));
        }).toList();
        cobrancas.registrar(entrada.unidadeId(), entrada.intencaoId(), entrada.comandaId(), parcelas, BigDecimal.ZERO);
        repository.historico(entrada.intencaoId(), ator == null ? participante.participanteId() : ator.usuarioId(), "PEDIDO_ENVIADO", "Pedido confirmado pelo servidor.", agora);
        eventos.registrar(entrada.unidadeId(), "PEDIDO_ENVIADO", entrada.intencaoId(), entrada.comandaId(),
                ator == null ? null : ator.usuarioId(), participante == null ? null : participante.participanteId());
        return repository.consultar(entrada.intencaoId(), false).orElseThrow();
    }

    private void autorizar(IdentidadeAtual ator, ParticipanteAtual participante, EnviarPedido entrada, boolean assistido, boolean existente) {
        if (participante != null) {
            acessos.bloquearPoliticaOperacional();
            if (!participante.comandaId().equals(entrada.comandaId()) || !participante.unidadeId().equals(entrada.unidadeId())) throw ErrosPedido.inexistente();
            sessoes.validar(participante);
        } else if (assistido) {
            if (existente) acessos.autorizarOperacaoExistente(ator, Acao.PEDIDO_CRIAR, entrada.unidadeId());
            else acessos.autorizar(ator, Acao.PEDIDO_CRIAR, entrada.unidadeId());
        } else {
            acessos.autorizarCliente(ator);
        }
    }

    private void validarCanal(EnviarPedido entrada, ParticipanteAtual participante, boolean assistido) {
        if ((entrada.canal() == CanalAtendimento.MESA) != (entrada.comandaId() != null)) throw ErrosPedido.regra("Informe a comanda somente para pedidos de mesa.");
        if (entrada.canal() == CanalAtendimento.MESA && participante == null && !assistido) throw ErrosPedido.regra("Autorize a sessão da mesa antes de enviar uma rodada.");
        if (participante != null && entrada.canal() != CanalAtendimento.MESA) throw ErrosPedido.regra("Esta sessão permite somente pedidos da mesa.");
        if (entrada.canal() == CanalAtendimento.DELIVERY) {
            if (!deliveryControlado) throw ErrosPedido.regra("Delivery disponível somente no cenário controlado de desenvolvimento e testes.");
            if (entrada.endereco() == null) throw ErrosPedido.regra("Informe o endereço fictício de entrega.");
        } else if (entrada.endereco() != null) throw ErrosPedido.regra("Este canal não recebe endereço de entrega.");
        String observacao = entrada.observacao();
        if (observacao != null && observacao.chars().anyMatch(c -> Character.isISOControl(c) && c != '\n')) throw ErrosPedido.regra("Observação contém caracteres de controle.");
    }
}
