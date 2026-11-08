package br.com.restaurantmanager.pedidos.services;

import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.mesas.models.ParticipanteAtual;
import br.com.restaurantmanager.pedidos.dtos.ComandoPedido;
import br.com.restaurantmanager.pedidos.dtos.PedidoDetalhe;
import br.com.restaurantmanager.pedidos.dtos.ResultadoAcaoPedido;
import br.com.restaurantmanager.pedidos.dtos.UnidadeProducao;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.models.EstadoPedido;
import br.com.restaurantmanager.pedidos.models.EstadoProducao;
import br.com.restaurantmanager.pedidos.models.PedidoRegistro;
import br.com.restaurantmanager.pedidos.repositories.PedidoRepository;
import br.com.restaurantmanager.unidades.models.CanalAtendimento;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PedidoComandoService {
    private final PedidoRepository repository;
    private final PedidoAcessoService acesso;
    private final AcessosService acessos;
    private final PedidoConsultaService consultas;
    private final PedidoFluxoService fluxo;
    private final Clock clock;

    public PedidoComandoService(PedidoRepository repository, PedidoAcessoService acesso, AcessosService acessos,
            PedidoConsultaService consultas, PedidoFluxoService fluxo, @Qualifier("pedidosClock") Clock clock) {
        this.repository = repository;
        this.acesso = acesso;
        this.acessos = acessos;
        this.consultas = consultas;
        this.fluxo = fluxo;
        this.clock = clock;
    }

    @Transactional(timeout = 20)
    public ResultadoAcaoPedido operacional(IdentidadeAtual ator, UUID id, String acao, ComandoPedido comando, UUID solicitacaoId) {
        repository.bloquearIntencao(comando.intencaoId());
        Acao permissao = permissao(acao);
        PedidoRegistro pedido = acesso.operacao(ator, id, permissao, true);
        // A permissão de cancelamento considera o pedido inteiro, nunca só a unidade selecionada.
        if (acao.equals("cancelar") || acao.equals("aprovar") || acao.equals("rejeitar")) {
            acessos.autorizarOperacaoExistente(ator, pedido.primeiroPreparoEm() == null ? Acao.CANCELAR_ANTES : Acao.CANCELAR_APOS, pedido.unidadeId());
        }
        String chaveAcao = acao + (solicitacaoId == null ? "" : ":" + solicitacaoId);
        if (repetido(pedido, ator.usuarioId(), chaveAcao, comando)) return resultado(pedido.id(), false);
        Instant agora = clock.instant();
        if (acao.equals("aceitar") && fluxo.expirarSeNecessario(pedido, agora)) return resultado(pedido.id(), true);
        versao(pedido, comando);
        switch (acao) {
            case "aceitar" -> {
                semUnidades(comando);
                exigir(pedido.estado() == EstadoPedido.AGUARDANDO_ACEITE, "Este pedido não aguarda aceite.");
                fluxo.alterar(pedido, EstadoPedido.NA_FILA, null, ator.usuarioId(), "PEDIDO_ACEITO", "Pedido aceito pela equipe.", agora);
            }
            case "recusar" -> {
                semUnidades(comando);
                exigir(pedido.estado() == EstadoPedido.AGUARDANDO_ACEITE, "Este pedido não aguarda aceite.");
                fluxo.cancelar(pedido, List.of(), comando.intencaoId(), ator.usuarioId(), ErrosPedido.motivo(comando.motivo()), agora, "PEDIDO_RECUSADO");
            }
            case "cancelar" -> fluxo.cancelar(pedido, comando.unidades(), comando.intencaoId(), ator.usuarioId(), ErrosPedido.motivo(comando.motivo()), agora, "PEDIDO_CANCELADO");
            case "iniciar", "concluir" -> produzir(pedido, ator.usuarioId(), acao, comando, agora);
            case "servir" -> {
                semUnidades(comando);
                exigir(pedido.canal() == CanalAtendimento.MESA && pedido.estado() == EstadoPedido.PRONTO, "Somente pedido de mesa pronto pode ser servido.");
                exigir(repository.solicitacoes(pedido.id()).stream().noneMatch(s -> s.estado().equals("PENDENTE")),
                        "Decida a solicitação de cancelamento antes de servir o pedido.");
                fluxo.alterar(pedido, EstadoPedido.CONCLUIDO, null, ator.usuarioId(), "PEDIDO_SERVIDO", "Pedido servido na mesa.", agora);
            }
            case "aprovar", "rejeitar" -> decidir(pedido, ator.usuarioId(), solicitacaoId, acao.equals("aprovar"), comando, agora);
            default -> throw ErrosPedido.regra("Ação de pedido inválida.");
        }
        registrarComando(pedido, ator.usuarioId(), chaveAcao, comando);
        return resultado(pedido.id(), false);
    }

    @Transactional(timeout = 20)
    public PedidoDetalhe cliente(IdentidadeAtual ator, UUID id, String acao, ComandoPedido comando) {
        repository.bloquearIntencao(comando.intencaoId());
        PedidoRegistro pedido = acesso.cliente(ator, id, true);
        executarProprio(pedido, ator.usuarioId(), acao, comando);
        return consultas.detalhe(repository.consultar(id, false).orElseThrow());
    }

    @Transactional(timeout = 20)
    public PedidoDetalhe participante(ParticipanteAtual ator, UUID id, String acao, ComandoPedido comando) {
        repository.bloquearIntencao(comando.intencaoId());
        PedidoRegistro pedido = acesso.participante(ator, id, true);
        executarProprio(pedido, ator.participanteId(), acao, comando);
        return consultas.detalhe(repository.consultar(id, false).orElseThrow());
    }

    private void executarProprio(PedidoRegistro pedido, UUID ator, String acao, ComandoPedido comando) {
        if (repetido(pedido, ator, acao, comando)) return;
        versao(pedido, comando);
        semUnidades(comando);
        String motivo = ErrosPedido.motivo(comando.motivo());
        Instant agora = clock.instant();
        if (acao.equals("cancelar")) {
            exigir(pedido.primeiroPreparoEm() == null, "O preparo já começou. Solicite avaliação da equipe.");
            fluxo.cancelar(pedido, List.of(), comando.intencaoId(), ator, motivo, agora, "AUTOCANCELAMENTO");
        } else if (acao.equals("solicitar-cancelamento")) {
            exigir(pedido.primeiroPreparoEm() != null && pedido.estado() != EstadoPedido.CANCELADO
                    && pedido.estado() != EstadoPedido.CONCLUIDO, "Solicitação não permitida neste estado.");
            exigir(repository.solicitacoes(pedido.id()).stream().noneMatch(s -> s.estado().equals("PENDENTE")), "Já existe solicitação de cancelamento aguardando decisão.");
            repository.solicitar(comando.intencaoId(), pedido.id(), motivo, agora);
            fluxo.alterar(pedido, pedido.estado(), null, ator, "CANCELAMENTO_SOLICITADO", motivo, agora);
        } else throw ErrosPedido.regra("Ação de pedido inválida.");
        registrarComando(pedido, ator, acao, comando);
    }

    private void produzir(PedidoRegistro pedido, UUID ator, String acao, ComandoPedido comando, Instant agora) {
        exigir(pedido.estado() == EstadoPedido.NA_FILA || pedido.estado() == EstadoPedido.EM_PREPARO,
                "O pedido não está disponível para produção.");
        List<UUID> ids = comando.unidades();
        var unidades = repository.unidades(pedido.id());
        EstadoProducao esperado = acao.equals("iniciar") ? EstadoProducao.NA_FILA : EstadoProducao.EM_PREPARO;
        if (ids.isEmpty() || ids.stream().distinct().count() != ids.size()
                || ids.stream().anyMatch(id -> unidades.stream().noneMatch(u -> u.id().equals(id) && u.estado() == esperado))) {
            throw ErrosPedido.conflito("Todas as unidades selecionadas devem pertencer ao pedido e estar no estado esperado. Recarregue a fila.");
        }
        EstadoProducao destino = acao.equals("iniciar") ? EstadoProducao.EM_PREPARO : EstadoProducao.PRONTO;
        ids.stream().sorted().forEach(id -> repository.alterarUnidade(id, destino, agora));
        boolean iniciou = acao.equals("iniciar");
        fluxo.alterar(pedido, fluxo.agregado(pedido, iniciou), iniciou ? agora : null, ator,
                iniciou ? "PREPARO_INICIADO" : "PREPARO_CONCLUIDO", "Unidades comerciais: " + ids.size() + ".", agora);
    }

    private void decidir(PedidoRegistro pedido, UUID ator, UUID solicitacaoId, boolean aprovar, ComandoPedido comando, Instant agora) {
        String motivo = ErrosPedido.motivo(comando.motivo());
        var solicitacao = repository.solicitacoes(pedido.id()).stream().filter(s -> s.id().equals(solicitacaoId)).findFirst().orElseThrow(ErrosPedido::inexistente);
        exigir(solicitacao.estado().equals("PENDENTE"), "Esta solicitação já foi decidida.");
        exigir(pedido.estado() != EstadoPedido.CONCLUIDO && pedido.estado() != EstadoPedido.CANCELADO, "O pedido já foi encerrado.");
        // A decisão e suas consequências confirmam juntas. Uma seleção inválida
        // desfaz também a decisão, sem disparar outra aprovação automática.
        repository.decidir(solicitacaoId, aprovar, agora);
        if (aprovar) fluxo.cancelar(pedido, comando.unidades(), comando.intencaoId(), ator, motivo, agora, "CANCELAMENTO_APROVADO");
        else {
            semUnidades(comando);
            fluxo.alterar(pedido, pedido.estado(), null, ator, "CANCELAMENTO_REJEITADO", motivo, agora);
        }
    }

    private boolean repetido(PedidoRegistro pedido, UUID ator, String acao, ComandoPedido comando) {
        repository.bloquearIntencao(comando.intencaoId());
        var anterior = repository.comando(comando.intencaoId());
        if (anterior.isEmpty()) return false;
        Object[] valor = anterior.get();
        if (!pedido.id().equals(valor[0]) || !ator.equals(valor[1]) || !acao.equals(valor[2]) || !repository.json(comando).equals(valor[3])) {
            throw ErrosPedido.conflito("Esta intenção já foi utilizada com outros dados.");
        }
        return true;
    }

    private void registrarComando(PedidoRegistro pedido, UUID ator, String acao, ComandoPedido comando) {
        repository.comando(comando.intencaoId(), pedido.id(), ator, acao, repository.json(comando));
    }

    private void versao(PedidoRegistro pedido, ComandoPedido comando) {
        if (pedido.versao() != comando.versao()) throw ErrosPedido.conflito("O pedido mudou. Recarregue antes de executar a ação.");
    }

    private void semUnidades(ComandoPedido comando) {
        if (!comando.unidades().isEmpty()) throw ErrosPedido.regra("Esta ação não recebe seleção de unidades comerciais.");
    }

    private void exigir(boolean condicao, String mensagem) {
        if (!condicao) throw ErrosPedido.conflito(mensagem);
    }

    private ResultadoAcaoPedido resultado(UUID id, boolean expirado) {
        return new ResultadoAcaoPedido(consultas.operacional(repository.consultar(id, false).orElseThrow()), expirado);
    }

    private Acao permissao(String acao) {
        return switch (acao) {
            case "aceitar" -> Acao.PEDIDO_ACEITAR;
            case "recusar" -> Acao.PEDIDO_RECUSAR;
            case "iniciar" -> Acao.COZINHA_INICIAR;
            case "concluir" -> Acao.COZINHA_CONCLUIR;
            case "servir" -> Acao.PEDIDO_SERVIR;
            case "cancelar", "aprovar", "rejeitar" -> Acao.PEDIDO_CONSULTAR;
            default -> throw ErrosPedido.regra("Ação de pedido inválida.");
        };
    }
}
