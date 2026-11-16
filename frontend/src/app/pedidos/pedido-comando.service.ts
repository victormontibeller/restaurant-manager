import { Injectable, inject, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { SessaoMesaService } from '../mesas/sessao-mesa.service';
import { ComandoPedido, Pedido } from './modelos';

export interface IntencaoComando {
  rota: string;
  corpo:
    | ComandoPedido
    | {
        intencaoId: string;
        versao: number;
        motivo: string;
        decisao: string | null;
        devolverTaxa: boolean | null;
      };
}

interface IntencaoPendente {
  intencao: IntencaoComando;
  unidadeId: string;
}

@Injectable({ providedIn: 'root' })
export class PedidoComandoService {
  private readonly sessao = inject(SessaoService);
  private readonly mesa = inject(SessaoMesaService);
  private readonly intencoes = new Map<string, IntencaoPendente>();
  readonly alteracao = signal(0);
  readonly ocupado = signal(false);

  constructor() {
    window.addEventListener('beforeunload', (event) => {
      if (this.intencoes.size) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  pendente(pedido: string, mesa: boolean): IntencaoComando | null {
    this.alteracao();
    return this.intencoes.get(this.chave(pedido, mesa))?.intencao ?? null;
  }

  pendenciasDaFila(unidadeId: string): string[] {
    this.alteracao();
    const prefixo = this.chave('', false);
    return Array.from(this.intencoes)
      .filter(
        ([chave, pendencia]) => chave.startsWith(prefixo) && pendencia.unidadeId === unidadeId,
      )
      .map(([chave]) => chave.slice(prefixo.length));
  }

  async executar(
    pedido: string,
    mesa: boolean,
    intencao: IntencaoComando,
    unidadeDaFila = '',
  ): Promise<Pedido> {
    if (this.ocupado()) throw new Error('Aguarde a operação em andamento.');
    const chave = this.chave(pedido, mesa);
    const anterior = this.intencoes.get(chave);
    if (anterior && JSON.stringify(anterior.intencao) !== JSON.stringify(intencao))
      throw new Error('Confirme o resultado da ação anterior antes de outra alteração.');
    this.intencoes.set(
      chave,
      anterior ?? { intencao: structuredClone(intencao), unidadeId: unidadeDaFila },
    );
    this.alteracao.update((valor) => valor + 1);
    this.ocupado.set(true);
    try {
      const resultado = await (mesa ? this.mesa : this.sessao).api<Pedido>(
        intencao.rota,
        'POST',
        intencao.corpo,
      );
      this.intencoes.delete(chave);
      this.alteracao.update((valor) => valor + 1);
      if (chave !== this.chave(pedido, mesa))
        throw new Error('Resposta de sessão anterior descartada.');
      return resultado;
    } catch (error) {
      if (!anterior && error instanceof ApiFailure && error.status >= 400 && error.status < 500) {
        this.intencoes.delete(chave);
        this.alteracao.update((valor) => valor + 1);
      }
      throw error;
    } finally {
      this.ocupado.set(false);
    }
  }

  private chave(pedido: string, mesa: boolean): string {
    return (
      location.origin +
      ':' +
      (mesa ? this.mesa.participante()?.participanteId : this.sessao.identidade()?.usuarioId) +
      ':' +
      pedido
    );
  }
}
