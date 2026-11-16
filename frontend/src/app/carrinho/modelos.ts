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
  midiaId?: string | null;
  resumoCustomizacao?: string;
  pontoCarne?: string;
  observacaoItem?: string;
  aceitaObservacao?: boolean;
  permitePontoCarne?: boolean;
}

export function montarObservacaoPedido(
  itens: readonly ItemCarrinho[],
  observacaoGeral: string,
  limite = 500,
): string {
  const blocos: string[] = [];
  for (const item of itens) {
    const detalhes: string[] = [];
    if (item.pontoCarne?.trim()) detalhes.push('Ponto: ' + item.pontoCarne.trim());
    if (item.observacaoItem?.trim()) detalhes.push('Obs: ' + item.observacaoItem.trim());
    if (detalhes.length) {
      blocos.push(`${item.linha.quantidade}x ${item.nome} (${detalhes.join('; ')})`);
    }
  }
  const notasItens = blocos.join(' | ');
  const geral = observacaoGeral.replace(/[\r\n\t]+/g, ' ').trim();
  const combinado =
    notasItens && geral
      ? `[Itens] ${notasItens}\n[Geral] ${geral}`
      : notasItens
        ? `[Itens] ${notasItens}`
        : geral;
  return combinado.length <= limite ? combinado : combinado.slice(0, limite - 1).trimEnd() + '…';
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
