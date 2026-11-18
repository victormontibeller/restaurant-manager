export const TIPOS_PAGAMENTO = {
  CHECKOUT: 'Pagamento online',
  DEVOLUCAO: 'Devolução',
};
export const ESTADOS_PAGAMENTO = {
  SOLICITADO: 'Solicitado',
  AGUARDANDO: 'Aguardando pagamento',
  EM_RECONCILIACAO: 'Em reconciliação',
  BLOQUEADO: 'Bloqueado',
  SOLICITADA: 'Solicitada',
  EM_PROCESSAMENTO: 'Em processamento',
  FALHOU: 'Falhou',
};
export const ESTADOS_NOTIFICACAO = {
  PENDENTE: 'Pendente',
  CAPTURADO: 'Capturado localmente',
  FALHOU: 'Falhou',
};
export const TIPOS_NOTIFICACAO = {
  PEDIDO_ACEITO: 'Pedido aceito',
  PEDIDO_RECUSADO: 'Pedido recusado',
  PEDIDO_CANCELADO: 'Pedido cancelado',
  AUTOCANCELAMENTO: 'Cancelamento pelo cliente',
  PEDIDO_EXPIRADO: 'Prazo de aceite expirado',
  PAGAMENTO_EXPIRADO: 'Prazo de pagamento expirado',
  PREPARO_CONCLUIDO: 'Preparo concluído',
  PEDIDO_DESPACHAR: 'Pedido despachado',
  ENTREGA_CANCELADA: 'Entrega cancelada',
  DEVOLUCAO_SOLICITADA: 'Devolução solicitada',
  DEVOLUCAO_FALHOU: 'Falha na devolução',
  DEVOLUCAO_CONFIRMADA: 'Devolução confirmada',
};
const ROTULOS: Record<string, string> = {
  ...TIPOS_PAGAMENTO,
  ...ESTADOS_PAGAMENTO,
  ...ESTADOS_NOTIFICACAO,
  ...TIPOS_NOTIFICACAO,
  AJUSTE: 'Ajuste de cobrança',
  RECEBIMENTO: 'Recebimento',
  DINHEIRO: 'Dinheiro',
  CARTAO: 'Cartão',
  PIX: 'Pix',
  ONLINE: 'Online',
};

export function rotulo(codigo: string | null): string {
  return codigo ? (ROTULOS[codigo] ?? codigo) : '—';
}

export function dataHora(iso: string, fuso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: fuso,
    dateStyle: 'short',
    timeStyle: 'short',
  });
}
