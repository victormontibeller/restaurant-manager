import { Injectable, inject, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { SessaoMesaService } from '../mesas/sessao-mesa.service';
import { EnvioPedido, Pedido } from './modelos';

export interface IntencaoPedido {
  contexto: string;
  rota: string;
  consulta: string;
  corpo: EnvioPedido;
}

export interface RascunhoPedido {
  observacao: string;
  comandaId: string;
  paginaMesas: number;
}

@Injectable({ providedIn: 'root' })
export class PedidoEnvioService {
  private readonly sessao = inject(SessaoService);
  private readonly mesa = inject(SessaoMesaService);
  private readonly pendentes = new Map<string, IntencaoPedido>();
  private readonly rascunhos = new Map<string, RascunhoPedido>();
  readonly alteracao = signal(0);
  readonly ocupado = signal(false);
  readonly confirmado = signal(0);

  constructor() {
    window.addEventListener('beforeunload', (event) => {
      if (this.pendentes.size) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  contexto(tipoMesa: boolean): string {
    return (
      location.origin +
      (tipoMesa
        ? ':mesa:' + (this.mesa.participante()?.participanteId ?? '')
        : ':conta:' + (this.sessao.identidade()?.usuarioId ?? ''))
    );
  }

  pendente(tipoMesa: boolean): IntencaoPedido | null {
    this.alteracao();
    return this.pendentes.get(this.contexto(tipoMesa)) ?? null;
  }

  rascunho(tipoMesa: boolean, unidadeId: string, canal: string): RascunhoPedido {
    const chave = this.contexto(tipoMesa) + ':' + unidadeId + ':' + canal;
    let rascunho = this.rascunhos.get(chave);
    if (!rascunho) {
      rascunho = { observacao: '', comandaId: '', paginaMesas: 0 };
      this.rascunhos.set(chave, rascunho);
    }
    return rascunho;
  }

  async enviar(corpo: EnvioPedido, tipoMesa: boolean): Promise<Pedido> {
    if (this.ocupado()) throw new Error('Aguarde a confirmação da operação em andamento.');
    const contexto = this.contexto(tipoMesa);
    const anterior = this.pendentes.get(contexto);
    const assistido = !tipoMesa && this.sessao.identidade()?.perfil !== 'CLIENTE';
    const rota = tipoMesa
      ? '/api/v1/mesa/pedidos'
      : assistido
        ? '/api/v1/operacao/pedidos'
        : '/api/v1/pedidos';
    if (anterior && JSON.stringify(anterior.corpo) !== JSON.stringify(corpo))
      throw new Error(
        'Existe um envio sem confirmação. Consulte esse resultado antes de criar outro.',
      );
    const intencao: IntencaoPedido = anterior ?? {
      contexto,
      rota,
      consulta:
        (tipoMesa ? '/api/v1/mesa/pedidos' : assistido ? rota : '/api/v1/me/pedidos') +
        '/intencoes/' +
        corpo.intencaoId,
      corpo: structuredClone(corpo),
    };
    this.pendentes.set(contexto, intencao);
    this.alteracao.update((valor) => valor + 1);
    this.ocupado.set(true);
    try {
      const pedido = await (tipoMesa ? this.mesa : this.sessao).api<Pedido>(
        intencao.rota,
        'POST',
        intencao.corpo,
      );
      this.pendentes.delete(contexto);
      this.alteracao.update((valor) => valor + 1);
      if (contexto !== this.contexto(tipoMesa))
        throw new Error('Pedido pertence à sessão anterior.');
      this.confirmado.update((valor) => valor + 1);
      return pedido;
    } catch (error) {
      // Uma rejeição definitiva do primeiro envio não cria pedido. Resultado
      // anterior incerto continua pendente, inclusive após um retry rejeitado.
      if (!anterior && error instanceof ApiFailure && error.status >= 400 && error.status < 500) {
        this.pendentes.delete(contexto);
        this.alteracao.update((valor) => valor + 1);
      }
      throw error;
    } finally {
      this.ocupado.set(false);
    }
  }

  async reconciliar(tipoMesa: boolean): Promise<Pedido | null> {
    const intencao = this.pendente(tipoMesa);
    if (!intencao || this.ocupado()) return null;
    this.ocupado.set(true);
    try {
      const pedido = await (tipoMesa ? this.mesa : this.sessao).api<Pedido>(intencao.consulta);
      this.pendentes.delete(intencao.contexto);
      this.alteracao.update((valor) => valor + 1);
      if (intencao.contexto !== this.contexto(tipoMesa))
        throw new Error('Sessão anterior descartada.');
      this.confirmado.update((valor) => valor + 1);
      return pedido;
    } catch (error) {
      // 404 permite reenviar a MESMA intenção, nunca fabricar outra durante incerteza.
      if (error instanceof ApiFailure && error.status === 404) return null;
      throw error;
    } finally {
      this.ocupado.set(false);
    }
  }
}
