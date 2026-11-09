import { EnderecoPedido } from '../pedidos/modelos';

export interface RegiaoDelivery {
  id: string;
  nome: string;
  cepInicial: string;
  cepFinal: string;
  taxa: string;
  minimo: string;
  ativa: boolean;
}
export interface ConfigDelivery {
  versao: number;
  checkoutSegundos: number;
  regioes: RegiaoDelivery[];
}
export interface OrcamentoEntrega {
  regiaoId: string;
  regiao: string;
  taxa: string;
  minimo: string;
  total: string;
  revisao: string;
}
export interface EntregaConfirmada {
  endereco: EnderecoPedido;
  orcamento: OrcamentoEntrega;
}
export interface EnderecoCliente {
  id: string;
  versao: number;
  descricao: string;
  endereco: EnderecoPedido;
  ativo: boolean;
}
