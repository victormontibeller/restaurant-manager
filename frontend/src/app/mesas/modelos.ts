export interface ParticipanteAtual {
  participanteId: string;
  sessaoId: string;
  empresaId: string;
  atendimentoId: string;
  comandaId: string;
  unidadeId: string;
}

export interface Mesa {
  id: string;
  unidadeId: string;
  nome: string;
  ativa: boolean;
  versao: number;
  atendimentoId: string | null;
  atendimentoVersao: number | null;
  comandaId: string | null;
  estadoComanda: string | null;
}

export interface AberturaAtendimento {
  atendimentoId: string;
  comandaId: string;
  mesaId: string;
  unidadeId: string;
  codigoTemporario: string | null;
  versao: number;
}

export interface Comanda {
  id: string;
  unidadeId: string;
  atendimentoId: string;
  mesaId: string;
  mesaNome: string;
  estado: 'ABERTA' | 'EM_FECHAMENTO' | 'FECHADA';
  versao: number;
  totalDevido: string;
  pagoConfirmado: string;
  devolvidoConfirmado: string;
  saldoAReceber: string;
  saldoADevolver: string;
  pendenciaFinanceira: boolean;
}

export interface SolicitacaoMesa {
  id: string;
  comandaId: string;
  mesaNome: string;
  tipo: 'AJUDA' | 'CONTA';
  estado: string;
  criadaEm: string;
  versao: number;
}
