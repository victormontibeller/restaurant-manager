import { Injectable, inject, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { EnderecoCliente } from './modelos';

@Injectable({ providedIn: 'root' })
export class EnderecosService {
  private readonly sessao = inject(SessaoService);
  private readonly intencoes = new Map<string, EnderecoCliente>();
  readonly alteracao = signal(0);
  readonly ocupado = signal(false);
  constructor() {
    window.addEventListener('beforeunload', (e) => {
      if (this.intencoes.size) {
        e.preventDefault();
        e.returnValue = '';
      }
    });
  }
  private chave(): string {
    return location.origin + ':' + this.sessao.identidade()?.usuarioId;
  }
  pendente(): EnderecoCliente | null {
    this.alteracao();
    return this.intencoes.get(this.chave()) ?? null;
  }
  async salvar(entrada: EnderecoCliente): Promise<EnderecoCliente> {
    if (this.ocupado()) throw new Error('Aguarde o salvamento do endereço.');
    const chave = this.chave();
    const anterior = this.intencoes.get(chave);
    if (anterior && JSON.stringify(anterior) !== JSON.stringify(entrada))
      throw new Error('Recupere o endereço anterior antes de outra alteração.');
    this.intencoes.set(chave, structuredClone(entrada));
    this.alteracao.update((v) => v + 1);
    this.ocupado.set(true);
    try {
      const resultado = await this.sessao.api<EnderecoCliente>(
        '/api/v1/clientes/me/enderecos/' + entrada.id,
        'PUT',
        entrada,
      );
      this.intencoes.delete(chave);
      this.alteracao.update((v) => v + 1);
      if (chave !== this.chave()) throw new Error('Resposta de sessão anterior descartada.');
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
