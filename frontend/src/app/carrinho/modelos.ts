import { Canal } from '../catalogo/modelos';

export interface SelecaoAdicional {
  adicionalId: string;
  quantidade: number;
}

export interface Escolha {
  grupoId: string;
  opcaoId: string;
  quantidade: number;
  adicionais: SelecaoAdicional[];
}

export interface LinhaCarrinho {
  id: string;
  produtoId: string;
  quantidade: number;
  adicionais: SelecaoAdicional[];
  escolhas: Escolha[];
}

export interface ItemCarrinho {
  linha: LinhaCarrinho;
  nome: string;
}

export interface SnapshotAdicional extends SelecaoAdicional {
  nome: string;
  precoUnitario: string;
  total: string;
}

export interface SnapshotEscolha extends Omit<Escolha, 'adicionais'> {
  grupo: string;
  produtoId: string;
  nome: string;
  acrescimo: string;
  adicionais: SnapshotAdicional[];
  total: string;
}

export interface SnapshotLinha extends Omit<LinhaCarrinho, 'adicionais' | 'escolhas'> {
  nome: string;
  tipo: 'SIMPLES' | 'COMBO';
  precoBase: string;
  precoUnitario: string;
  subtotal: string;
  adicionais: SnapshotAdicional[];
  escolhas: SnapshotEscolha[];
}

export interface ResumoCarrinho {
  unidadeId: string;
  canal: Canal;
  moeda: 'BRL';
  revisao: string;
  requerConfirmacao: boolean;
  linhas: SnapshotLinha[];
  subtotal: string;
  total: string;
}

export interface ContextoCarrinho {
  unidadeId: string;
  unidadeNome: string;
  canal: Canal;
}
