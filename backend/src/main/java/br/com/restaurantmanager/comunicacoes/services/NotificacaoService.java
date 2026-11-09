package br.com.restaurantmanager.comunicacoes.services;

import br.com.restaurantmanager.comunicacoes.dtos.NotificacaoOperacional;
import br.com.restaurantmanager.comunicacoes.dtos.TrabalhoNotificacao;
import br.com.restaurantmanager.comunicacoes.repositories.NotificacaoRepository;
import br.com.restaurantmanager.identidade.infrastructure.CapturaEmail;
import br.com.restaurantmanager.identidade.infrastructure.ProtecaoEmail;
import br.com.restaurantmanager.identidade.models.Acao;
import br.com.restaurantmanager.identidade.models.IdentidadeAtual;
import br.com.restaurantmanager.identidade.services.AcessosService;
import br.com.restaurantmanager.identidade.services.ContatoClienteService;
import br.com.restaurantmanager.pedidos.exceptions.ErrosPedido;
import br.com.restaurantmanager.pedidos.services.ContatoPedidoService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class NotificacaoService {
    private static final Map<String, String> TEMPLATES =
            Map.ofEntries(
                    Map.entry("PEDIDO_ACEITO", "Seu pedido foi aceito pelo restaurante."),
                    Map.entry(
                            "PEDIDO_RECUSADO",
                            "Seu pedido foi recusado. Confira a situação da devolução no sistema."),
                    Map.entry(
                            "PEDIDO_CANCELADO",
                            "Seu pedido foi atualizado por cancelamento. Confira os itens e valores"
                                + " no sistema."),
                    Map.entry(
                            "AUTOCANCELAMENTO",
                            "Seu pedido foi cancelado. Cancelamento e devolução têm confirmações"
                                + " separadas."),
                    Map.entry(
                            "PEDIDO_EXPIRADO",
                            "Seu pedido foi cancelado porque o prazo de aceite expirou."),
                    Map.entry(
                            "PAGAMENTO_EXPIRADO",
                            "O prazo de pagamento do pedido expirou. Pagamento tardio exige"
                                + " devolução."),
                    Map.entry("PREPARO_CONCLUIDO", "Seu pedido está pronto para retirada."),
                    Map.entry("PEDIDO_DESPACHAR", "Seu pedido saiu para entrega."),
                    Map.entry(
                            "ENTREGA_CANCELADA",
                            "A entrega foi cancelada após avaliação da ocorrência. Confira os"
                                + " valores no sistema."),
                    Map.entry(
                            "DEVOLUCAO_SOLICITADA",
                            "Há uma devolução aguardando confirmação. Acompanhe pelo sistema."),
                    Map.entry(
                            "DEVOLUCAO_FALHOU",
                            "A devolução precisa de revisão pelo restaurante. O valor permanece"
                                + " reservado até a confirmação."),
                    Map.entry(
                            "DEVOLUCAO_CONFIRMADA",
                            "A devolução foi confirmada. O prazo de crédito depende do meio de"
                                + " pagamento."));
    private final NotificacaoRepository repository;
    private final ContatoPedidoService pedidos;
    private final ContatoClienteService contatos;
    private final AcessosService acessos;
    private final ProtecaoEmail protecao;
    private final CapturaEmail captura;
    private final TransactionTemplate tx;

    public NotificacaoService(
            NotificacaoRepository repository,
            ContatoPedidoService pedidos,
            ContatoClienteService contatos,
            AcessosService acessos,
            ProtecaoEmail protecao,
            CapturaEmail captura,
            PlatformTransactionManager manager) {
        this.repository = repository;
        this.pedidos = pedidos;
        this.contatos = contatos;
        this.acessos = acessos;
        this.protecao = protecao;
        this.captura = captura;
        tx = new TransactionTemplate(manager);
        tx.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        tx.setTimeout(15);
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void registrar(UUID unidade, String tipo, UUID pedido, UUID referencia) {
        if (tipo.equals("CANCELAMENTO_APROVADO")) tipo = "PEDIDO_CANCELADO";
        if (pedido == null || !TEMPLATES.containsKey(tipo)) return;
        var contato = pedidos.consultar(pedido);
        if (contato.usuarioId() == null) return;
        if (tipo.equals("PREPARO_CONCLUIDO")
                && (!contato.estado().equals("PRONTO") || !contato.canal().equals("RETIRADA")))
            return;
        UUID origem =
                referencia == null
                        ? UUID.nameUUIDFromBytes(
                                (pedido + ":" + tipo + ":" + contato.versao())
                                        .getBytes(StandardCharsets.UTF_8))
                        : referencia;
        repository.registrar(unidade, pedido, origem, tipo);
    }

    @Transactional
    public List<NotificacaoOperacional> listar(IdentidadeAtual ator, UUID unidade, int pagina) {
        acessos.autorizarOperacaoExistente(ator, Acao.PAGAMENTO_RECONCILIAR, unidade);
        if (pagina < 0 || pagina > 10000) throw ErrosPedido.regra("Página inválida.");
        return repository.listar(unidade, pagina);
    }

    public boolean processarProxima() {
        TrabalhoNotificacao t = tx.execute(s -> repository.reivindicar());
        if (t == null) return false;
        try {
            String cifra = t.conteudo();
            if (cifra == null) {
                cifra =
                        tx.execute(
                                s -> {
                                    var contato = pedidos.consultar(t.pedidoId());
                                    String email = contatos.email(contato.usuarioId());
                                    if (email == null)
                                        throw ErrosPedido.regra(
                                                "Contato indisponível para notificação.");
                                    String conteudo =
                                            "CAPTURA LOCAL — NÃO ENVIADO\nPara: "
                                                    + email
                                                    + "\nPedido: "
                                                    + t.pedidoId()
                                                    + "\n"
                                                    + TEMPLATES.get(t.tipo())
                                                    + "\n";
                                    String protegido = protecao.cifrar(t.id(), conteudo);
                                    repository.conteudo(t, protegido);
                                    return protegido;
                                });
            }
            captura.entregar(t.id(), protecao.decifrar(t.id(), cifra));
            tx.executeWithoutResult(s -> repository.concluir(t, true));
        } catch (IOException | RuntimeException erro) {
            tx.executeWithoutResult(s -> repository.concluir(t, false));
        }
        return true;
    }
}
