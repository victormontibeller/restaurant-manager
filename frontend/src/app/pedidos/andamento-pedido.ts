import type { Pedido } from './modelos';

const retirada = [
  { id: 'PRONTO', nome: 'Para retirar' },
  { id: 'CONCLUIDO', nome: 'Retirado' },
];

const mesa = [
  { id: 'PRONTO', nome: 'Para servir' },
  { id: 'CONCLUIDO', nome: 'Servido' },
];

const entrega = [
  { id: 'PRONTO', nome: 'Para despachar' },
  { id: 'EM_ENTREGA', nome: 'A caminho' },
  { id: 'CONCLUIDO', nome: 'Entregue' },
];

const etapasFinais = { MESA: mesa, RETIRADA: retirada, DELIVERY: entrega };

export function andamentoPedido({ estado, canal, pagoOnline }: Pedido) {
  if (estado === 'CANCELADO') return [];
  const etapas = [
    ...(pagoOnline || estado === 'AGUARDANDO_PAGAMENTO'
      ? [{ id: 'AGUARDANDO_PAGAMENTO', nome: 'Pagamento' }]
      : []),
    ...(canal === 'MESA' ? [] : [{ id: 'AGUARDANDO_ACEITE', nome: 'Aceite' }]),
    { id: 'EM_PREPARO', nome: 'Cozinha' },
    ...etapasFinais[canal],
  ];
  const indiceAtual = etapas.findIndex(
    (etapa) => etapa.id === (estado === 'NA_FILA' ? 'EM_PREPARO' : estado),
  );
  if (indiceAtual < 0) return [];
  return etapas.map((etapa, indice) => ({
    ...etapa,
    atual: indice === indiceAtual,
    concluida: indice < indiceAtual || estado === 'CONCLUIDO',
  }));
}

export function orientacaoPedido({ estado, canal, historico }: Pedido): string {
  switch (estado) {
    case 'AGUARDANDO_PAGAMENTO':
      return 'O pedido segue para aceite quando o pagamento for confirmado.';
    case 'AGUARDANDO_ACEITE':
      return 'O restaurante recebeu o pedido e ainda precisa aceitá-lo.';
    case 'NA_FILA':
      return 'Seu pedido entrou na fila da cozinha.';
    case 'EM_PREPARO':
      return 'A cozinha está preparando seu pedido.';
    case 'PRONTO':
      return {
        MESA: 'Seu pedido está pronto e aguarda a equipe servir na mesa.',
        RETIRADA: 'Seu pedido está pronto para retirar no restaurante.',
        DELIVERY: 'Seu pedido está pronto e aguarda o despacho.',
      }[canal];
    case 'EM_ENTREGA': {
      const ultimoEventoEntrega = historico
        ?.filter(({ tipo }) => tipo === 'ENTREGA_OCORRENCIA' || tipo === 'ENTREGA_NOVA_TENTATIVA')
        .at(-1);
      return ultimoEventoEntrega?.tipo === 'ENTREGA_OCORRENCIA'
        ? 'O restaurante registrou um problema na entrega e está avaliando como seguir.'
        : 'O restaurante despachou seu pedido.';
    }
    case 'CONCLUIDO':
      return {
        MESA: 'A equipe confirmou que o pedido foi servido.',
        RETIRADA: 'A equipe confirmou a retirada.',
        DELIVERY: 'A equipe confirmou a entrega.',
      }[canal];
    case 'CANCELADO':
      return 'Acompanhe o histórico e a situação dos valores abaixo.';
    default:
      return '';
  }
}
