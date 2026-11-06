import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { SessaoService } from '../identidade/sessao.service';
import { mensagemErro } from './modelos';

@Injectable({ providedIn: 'root' })
export class FavoritosService {
  private readonly sessao = inject(SessaoService);
  private geracao = 0;
  readonly cliente = computed(() => this.sessao.identidade()?.perfil === 'CLIENTE');
  readonly ids = signal<string[]>([]);
  readonly ocupado = signal(false);
  readonly incerto = signal(false);
  readonly erro = signal('');

  constructor() {
    effect(() => {
      const pessoa = this.sessao.identidade();
      this.geracao++;
      this.ids.set([]);
      this.ocupado.set(false);
      this.incerto.set(false);
      this.erro.set('');
      if (pessoa?.perfil === 'CLIENTE') untracked(() => void this.consultar());
    });
  }

  async consultar(): Promise<void> {
    if (!this.cliente() || this.ocupado()) return;
    const geracao = this.geracao;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const resultado = await this.sessao.api<{ produtoIds: string[] }>(
        '/api/v1/clientes/me/favoritos',
      );
      if (geracao !== this.geracao) return;
      this.ids.set(resultado.produtoIds);
      this.incerto.set(false);
    } catch (error) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(error));
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }

  async alternar(id: string): Promise<void> {
    if (!this.cliente() || this.ocupado() || this.incerto() || !navigator.onLine) return;
    const geracao = this.geracao;
    const remover = this.ids().includes(id);
    this.ocupado.set(true);
    this.erro.set('');
    try {
      await this.sessao.api('/api/v1/clientes/me/favoritos/' + id, remover ? 'DELETE' : 'PUT');
      if (geracao !== this.geracao) return;
      this.ids.update((ids) =>
        remover ? ids.filter((atual) => atual !== id) : [...new Set([...ids, id])],
      );
    } catch (error) {
      if (geracao !== this.geracao) return;
      this.incerto.set(true);
      this.erro.set(mensagemErro(error) + ' Consulte seus favoritos para conferir o resultado.');
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }
}
