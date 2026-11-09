import { Injectable, inject, signal, effect } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { DetalheFinanceiro, IntencaoFinanceira } from './modelos';

@Injectable({ providedIn: 'root' })
export class FinanceiroService {
  private readonly sessao = inject(SessaoService);
  private readonly intencoes = new Map<string, IntencaoFinanceira>();
  readonly alteracao = signal(0);
  readonly ocupado = signal(false);

  constructor() {
    const nav = inject(NavegacaoProtegidaService);
    effect(() => {
      this.alteracao();
      const prefixo = location.origin + ':' + this.sessao.identidade()?.usuarioId + ':';
      nav.bloquear(
        'financeiro-intencoes',
        this.ocupado() || [...this.intencoes.keys()].some((chave) => chave.startsWith(prefixo)),
      );
    });
    window.addEventListener('beforeunload', (evento) => {
      if (this.intencoes.size) {
        evento.preventDefault();
        evento.returnValue = '';
      }
    });
  }

  chave(recurso: string): string {
    return location.origin + ':' + this.sessao.identidade()?.usuarioId + ':' + recurso;
  }

  pendente(recurso: string): IntencaoFinanceira | null {
    this.alteracao();
    return this.intencoes.get(this.chave(recurso)) ?? null;
  }

  async executar(recurso: string, intencao: IntencaoFinanceira): Promise<DetalheFinanceiro> {
    if (this.ocupado()) throw new Error('Aguarde a operação financeira em andamento.');
    const chave = this.chave(recurso);
    const anterior = this.intencoes.get(chave);
    if (anterior && JSON.stringify(anterior) !== JSON.stringify(intencao))
      throw new Error('Confira o resultado da operação anterior antes de outra alteração.');
    this.intencoes.set(chave, structuredClone(intencao));
    this.alteracao.update((v) => v + 1);
    this.ocupado.set(true);
    try {
      const resultado = await this.sessao.api<DetalheFinanceiro>(
        intencao.rota,
        'POST',
        intencao.corpo,
      );
      this.intencoes.delete(chave);
      this.alteracao.update((v) => v + 1);
      if (chave !== this.chave(recurso)) throw new Error('Resposta de sessão anterior descartada.');
      return resultado;
    } catch (erro) {
      if (!anterior && erro instanceof ApiFailure && erro.status >= 400 && erro.status < 500) {
        this.intencoes.delete(chave);
        this.alteracao.update((v) => v + 1);
      }
      throw erro;
    } finally {
      this.ocupado.set(false);
    }
  }
}
