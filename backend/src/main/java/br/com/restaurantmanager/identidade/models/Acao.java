package br.com.restaurantmanager.identidade.models;

import br.com.restaurantmanager.identidade.dtos.DescricaoAcao;
import br.com.restaurantmanager.identidade.exceptions.AuthFailure;

import java.util.Arrays;
import java.util.List;

/** Catálogo explícito: cadastrar uma ação não implementa a operação correspondente. */
public enum Acao {
    UNIDADE_ACOMPANHAR(
            "unidade.acompanhar", "Acompanhar atualizações cadastrais da unidade", "UNIDADE", null),
    CATALOGO_CONSULTAR("catalogo.consultar", "Consultar catálogo operacional", "UNIDADE", null),
    CATALOGO_EDITAR(
            "catalogo.editar",
            "Editar catálogo compartilhado entre filiais",
            "EMPRESA",
            "catalogo.consultar"),
    CATALOGO_UNIDADE(
            "catalogo.alterar_unidade",
            "Alterar preço e disponibilidade",
            "UNIDADE",
            "catalogo.consultar"),
    PEDIDO_CONSULTAR("pedido.consultar", "Consultar pedidos com dados mínimos", "UNIDADE", null),
    PEDIDO_CRIAR("pedido.criar_assistido", "Criar pedido assistido", "UNIDADE", "pedido.consultar"),
    PEDIDO_ACEITAR("pedido.aceitar", "Aceitar pedido", "UNIDADE", "pedido.consultar"),
    PEDIDO_RECUSAR("pedido.recusar", "Recusar pedido", "UNIDADE", "pedido.consultar"),
    COZINHA_INICIAR("cozinha.iniciar", "Iniciar preparo", "UNIDADE", "pedido.consultar"),
    COZINHA_CONCLUIR("cozinha.concluir", "Concluir preparo", "UNIDADE", "pedido.consultar"),
    PEDIDO_SERVIR("pedido.servir", "Servir na mesa", "UNIDADE", "pedido.consultar"),
    PEDIDO_RETIRAR("pedido.retirar", "Concluir retirada", "UNIDADE", "pedido.consultar"),
    PEDIDO_DESPACHAR("pedido.despachar", "Registrar saída", "UNIDADE", "pedido.consultar"),
    PEDIDO_ENTREGAR("pedido.entregar", "Concluir entrega", "UNIDADE", "pedido.consultar"),
    ENTREGA_OCORRENCIA(
            "entrega.registrar_ocorrencia",
            "Registrar ocorrência de entrega",
            "UNIDADE",
            "pedido.consultar"),
    ENTREGA_DECIDIR(
            "entrega.decidir_ocorrencia",
            "Decidir ocorrência após despacho",
            "UNIDADE",
            "pedido.consultar"),
    CANCELAR_ANTES(
            "pedido.cancelar_antes_preparo",
            "Cancelar antes do preparo",
            "UNIDADE",
            "pedido.consultar"),
    CANCELAR_APOS(
            "pedido.cancelar_apos_preparo", "Cancelar após preparo", "UNIDADE", "pedido.consultar"),
    MESA_ATENDER("mesa.atender", "Atender solicitações de mesa", "UNIDADE", "pedido.consultar"),
    FECHAMENTO_INICIAR(
            "comanda.iniciar_fechamento", "Iniciar fechamento", "UNIDADE", "pedido.consultar"),
    FECHAMENTO_REABRIR(
            "comanda.reabrir", "Reabrir comanda elegível", "UNIDADE", "pedido.consultar"),
    RECEBER("recebimento.registrar", "Registrar recebimento", "UNIDADE", "pedido.consultar"),
    FECHAMENTO_CONCLUIR("comanda.concluir", "Concluir fechamento", "UNIDADE", "pedido.consultar"),
    AJUSTAR("financeiro.ajustar", "Ajustar cobrança", "UNIDADE", "pedido.consultar"),
    DEVOLVER("devolucao.solicitar", "Solicitar devolução", "UNIDADE", "pedido.consultar"),
    PAGAMENTO_RECONCILIAR(
            "pagamento.reconciliar",
            "Recuperar operações financeiras e consultar notificações",
            "UNIDADE",
            "pedido.consultar"),
    RELATORIO("relatorio.consultar", "Consultar vendas da unidade", "UNIDADE", null),
    AUDITORIA("auditoria.consultar", "Consultar auditoria operacional", "EMPRESA", null);
    private final String codigo;
    private final String descricao;
    private final String escopo;
    private final String dependencia;

    Acao(String codigo, String descricao, String escopo, String dependencia) {
        this.codigo = codigo;
        this.descricao = descricao;
        this.escopo = escopo;
        this.dependencia = dependencia;
    }

    public String codigo() {
        return codigo;
    }

    public String escopo() {
        return escopo;
    }

    public String dependencia() {
        return dependencia;
    }

    public static List<DescricaoAcao> catalogo() {
        return Arrays.stream(values())
                .map(a -> new DescricaoAcao(a.codigo, a.descricao, a.escopo, a.dependencia))
                .toList();
    }

    public static Acao obter(String codigo) {
        return Arrays.stream(values())
                .filter(a -> a.codigo.equals(codigo))
                .findFirst()
                .orElseThrow(() -> new AuthFailure(400, "ACAO_INVALIDA", "Ação não reconhecida."));
    }
}
