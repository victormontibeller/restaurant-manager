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

export const PONTOS_CARNE = [
  'Mal passado',
  'Ao ponto menos',
  'Ao ponto',
  'Ao ponto mais',
  'Bem passado',
] as const;

const PADRAO_BEBIDA_INDUSTRIALIZADA =
  /\b(refrigerante|coca(?:-?cola)?|guaran[aá]|pepsi|fanta|sprite|soda|schweppes|t[oô]nica|h2oh|lata(?:\s*\d+)?|garrafa|long\s*neck|[aá]gua\s*mineral|isot[oô]nico|energ[eé]tico)\b/i;

const PADRAO_PREPARO_BEBIDA =
  /\b(limonada|suco\s*natural|milk\s*shake|milkshake|smoothie|vitamina|caf[eé]|ch[aá]\s*da\s*casa|coquetel|drink\s*da\s*casa)\b/i;

const PADRAO_PONTO_CARNE =
  /\b(burger|hamb[uú]rguer|smash|blend|picanha|alcatra|maminha|fraldinha|bife|steak|chorizo|ancho|costela(?:\s*bovina)?|fil[eé]\s*mignon|contrafil[eé]|entrec[oô]te|entrecote|medalh[aã]o|carne\s*(?:bovina|na\s*brasa))\b/i;

const PADRAO_NAO_BOVINA = /\b(frango|chicken|veggie|vegano|vegetariano|soja|peixe|til[aá]pia)\b/i;

export function produtoIndustrializadoBebida(
  produto: Pick<ProdutoPublico, 'nome' | 'descricao'> & { aceitaObservacao?: boolean },
  nomeCategoria = '',
): boolean {
  if (typeof produto.aceitaObservacao === 'boolean') return !produto.aceitaObservacao;
  const texto = `${produto.nome} ${produto.descricao ?? ''}`;
  if (PADRAO_PREPARO_BEBIDA.test(texto)) return false;
  if (PADRAO_BEBIDA_INDUSTRIALIZADA.test(texto)) return true;
  if (
    /\b(bebida|refrigerante)\b/i.test(nomeCategoria) &&
    !/\bartesanal|da\s*casa|natural\b/i.test(texto)
  ) {
    return /\b(lata|garrafa|ml|litro|refri|zero)\b/i.test(texto);
  }
  return false;
}

export function produtoExigePontoCarne(
  produto: Pick<ProdutoPublico, 'nome' | 'descricao'> & { exigePontoCarne?: boolean },
): boolean {
  if (typeof produto.exigePontoCarne === 'boolean') return produto.exigePontoCarne;
  const texto = `${produto.nome} ${produto.descricao ?? ''}`;
  if (!PADRAO_PONTO_CARNE.test(texto)) return false;
  if (
    PADRAO_NAO_BOVINA.test(texto) &&
    !/\b(blend|bovino|carne|picanha|costela|smash)\b/i.test(texto)
  ) {
    return false;
  }
  return true;
}

export function mensagemErro(error: unknown): string {
  return error instanceof Error ? error.message : 'Não foi possível concluir. Tente novamente.';
}
