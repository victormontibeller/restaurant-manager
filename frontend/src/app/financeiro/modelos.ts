import { SaldoPedido } from '../pedidos/modelos';

export interface DetalheFinanceiro {
  cobrancaId: string | null;
  saldo: SaldoPedido;
  reservado: string;
  parcelas: {
    id: string;
    pedidoId: string;
    unidadeComercialId: string | null;
    tipo: string;
    original: string;
    abatido: string;
    descricao: string;
  }[];
  recebimentos: {
    id: string;
    metodo: string;
    valor: string;
    entregue: string;
    troco: string;
    confirmadoEm: string;
  }[];
  devolucoes: {
    id: string;
    recebimentoId: string;
    valor: string;
    motivo: string;
    estado: string;
    criadaEm: string;
    confirmadaEm: string | null;
  }[];
}

export interface IntencaoFinanceira {
  rota: string;
  corpo: { intencaoId: string; [campo: string]: unknown };
}
