import { LinhaCarrinho, SnapshotAdicional, SnapshotEscolha } from '../carrinho/modelos';
import { Canal, Unidade } from '../catalogo/modelos';

export interface EnderecoPedido {
  destinatario?: string;
  contato?: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface EnvioPedido {
  intencaoId: string;
  unidadeId: string;
  canal: Canal;
  comandaId: string | null;
  revisao: string;
  linhas: LinhaCarrinho[];
  observacao: string;
  endereco: EnderecoPedido | null;
  revisaoDelivery?: string | null;
  pagamento?: 'PRESENCIAL' | 'ONLINE';
}

export interface UnidadeProducao {
  id: string;
  linhaId: string;
  estado: 'NA_FILA' | 'EM_PREPARO' | 'PRONTO' | 'CANCELADO';
  iniciadoEm: string | null;
  concluidoEm: string | null;
}

export interface LinhaPedido {
  id: string;
  produtoId?: string;
  nome: string;
  tipo: 'SIMPLES' | 'COMBO';
  quantidade: number;
  precoUnitario?: string;
  subtotal?: string;
  adicionais: Partial<SnapshotAdicional>[];
  escolhas: Partial<SnapshotEscolha>[];
}

export interface SaldoPedido {
  totalDevido: string;
  pagoConfirmado: string;
  devolvidoConfirmado: string;
  saldoAReceber: string;
  saldoADevolver: string;
  pendenciaFinanceira: boolean;
}

export interface SolicitacaoCancelamento {
  id: string;
  motivo: string;
  estado: string;
  criadaEm: string;
}

export interface Pedido {
  id: string;
  unidadeId: string;
  comandaId: string | null;
  canal: Canal;
  estado: string;
  versao: number;
  criadoEm: string;
  primeiroPreparoEm: string | null;
  alertarEm: string | null;
  expirarEm: string | null;
  observacao: string;
  linhas: LinhaPedido[];
  unidades: UnidadeProducao[];
  historico?: { tipo: string; motivo: string; ocorridoEm: string }[];
  solicitacoes?: SolicitacaoCancelamento[];
  saldo?: SaldoPedido;
  pagoOnline?: boolean;
  pagamentoExpiraEm?: string | null;
}

export interface PaginaPedidos {
  itens: Pedido[];
  mais: boolean;
}

export interface AcessosOperacao {
  perfil: string;
  versaoPolitica: number;
  acoes: string[];
  unidades: Unidade[];
}

export interface ComandoPedido {
  intencaoId: string;
  versao: number;
  motivo: string;
  unidades: string[];
}

export function nomeEstado(estado: string): string {
  return (
    {
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      AGUARDANDO_ACEITE: 'Aguardando aceite',
      NA_FILA: 'Na fila',
      EM_PREPARO: 'Em preparo',
      PRONTO: 'Pronto',
      CONCLUIDO: 'Concluído',
      CANCELADO: 'Cancelado',
      EM_ENTREGA: 'Em entrega',
      ABERTA: 'Aberta',
      EM_FECHAMENTO: 'Em fechamento',
      FECHADA: 'Fechada',
    }[estado] ?? estado
  );
}

export function horario(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString('pt-BR') : '—';
}
