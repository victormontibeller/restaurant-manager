export type Canal = 'DELIVERY' | 'RETIRADA' | 'MESA';

export const CANAIS: { valor: Canal; nome: string }[] = [
  { valor: 'DELIVERY', nome: 'Delivery' },
  { valor: 'RETIRADA', nome: 'Retirada' },
  { valor: 'MESA', nome: 'Mesa' },
];

export interface Pagina<T> {
  itens: T[];
  temMais: boolean;
}

export interface Unidade {
  id: string;
  nome: string;
  fuso: string;
}

export interface Categoria {
  id: string;
  nome: string;
  ativa: boolean;
  versao: number;
}

export interface Adicional {
  id: string;
  nome: string;
  preco: string;
  maximo: number;
  ativo: boolean;
}

export interface Opcao {
  id: string;
  produtoId: string;
  acrescimo: string;
  limite: number;
  adicionaisPermitidos: string[];
}

export interface Grupo {
  id: string;
  nome: string;
  minimo: number;
  maximo: number;
  opcoes: Opcao[];
}

export interface Produto {
  id: string;
  versao: number;
  nome: string;
  descricao: string;
  categoriaId: string;
  tipo: 'SIMPLES' | 'COMBO';
  ativo: boolean;
  sugerido: boolean;
  midiaId: string | null;
  adicionais: Adicional[];
  grupos: Grupo[];
}

export interface OpcaoPublica extends Opcao {
  nome: string;
  disponivel: boolean;
  adicionais: Adicional[];
}

export interface GrupoPublico extends Omit<Grupo, 'opcoes'> {
  opcoes: OpcaoPublica[];
}

export interface ProdutoPublico extends Omit<Produto, 'ativo' | 'grupos'> {
  preco: string;
  disponivel: boolean;
  grupos: GrupoPublico[];
}

export interface CatalogoPublico extends Pagina<ProdutoPublico> {
  categorias: Categoria[];
  aberto: boolean;
  consultadoEm: string;
  revisao: string;
}

export interface Oferta {
  produtoId: string;
  unidadeId: string;
  versao: number;
  preco: string;
  disponivel: boolean;
  canais: Canal[];
}

export interface Midia {
  id: string;
  url: string;
  contentType: string;
  largura: number;
  altura: number;
  tamanho: number;
  sha256: string;
}

export interface AcessosCatalogo {
  perfil: string;
  versaoPolitica: number;
  acoes: string[];
  unidades: Unidade[];
}

export function moeda(valor: string): string {
  const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(valor);
  if (!partes) return 'Valor indisponível';
  const inteiro = BigInt(partes[1]).toLocaleString('pt-BR');
  const centavos = (partes[2] ?? '').padEnd(2, '0');
  return 'R$\u00a0' + inteiro + ',' + centavos;
}

export function mensagemErro(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.';
}
