import { Pedido } from '../pedidos/modelos';

export interface CartaoCozinha {
  pedido: Pedido;
  mesaNome: string | null;
  prontoEm: string | null;
}
export interface GrupoCozinha {
  itens: CartaoCozinha[];
  total: number;
  mais: boolean;
}
export type GrupoPainel = 'fila' | 'emPreparo' | 'prontos' | 'anteriores';
export interface PainelCozinha {
  consultadoEm: string;
  fuso: string;
  fila: GrupoCozinha;
  emPreparo: GrupoCozinha;
  prontos: GrupoCozinha;
  anteriores: GrupoCozinha;
}
export function elegiveis(pedido: Pedido, acao: 'iniciar' | 'concluir'): string[] {
  const estado = acao === 'iniciar' ? 'NA_FILA' : 'EM_PREPARO';
  if (!['NA_FILA', 'EM_PREPARO'].includes(pedido.estado)) return [];
  return pedido.unidades.filter((u) => u.estado === estado).map((u) => u.id);
}
export function decorrido(data: string | null, agora: number): string {
  if (!data) return 'não informado';
  const minutos = Math.max(0, Math.floor((agora - Date.parse(data)) / 60000));
  return minutos < 1
    ? 'agora'
    : minutos < 60
      ? minutos + ' min'
      : Math.floor(minutos / 60) + ' h ' + (minutos % 60) + ' min';
}
