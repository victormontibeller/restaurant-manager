import { Injectable, inject, signal } from '@angular/core';
import { SessaoService } from './sessao.service';

@Injectable({ providedIn: 'root' })
export class SessaoNavegacaoService {
  readonly sessao = inject(SessaoService);
  readonly pronta = signal(false);
  readonly restaurando = signal(false);
  readonly encerrando = signal(false);
  readonly encerramentoPendente = signal(false);
  readonly aviso = signal('');
  private inicializacao: Promise<void> | null = null;

  constructor() {
    window.addEventListener('beforeunload', (event) => {
      if (this.encerramentoPendente()) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  inicializar(): Promise<void> {
    if (this.pronta()) return Promise.resolve();
    if (this.inicializacao) return this.inicializacao;
    this.restaurando.set(true);
    this.inicializacao = this.sessao
      .restaurar()
      .catch(() => {
        this.aviso.set('Não foi possível restaurar a sessão. Confira a conexão e entre novamente.');
      })
      .finally(() => {
        this.pronta.set(true);
        this.restaurando.set(false);
        this.inicializacao = null;
      });
    return this.inicializacao;
  }

  async sair(): Promise<void> {
    if (this.encerrando()) return;
    this.encerrando.set(true);
    this.encerramentoPendente.set(true);
    this.aviso.set('');
    try {
      await this.sessao.sair();
      this.encerramentoPendente.set(false);
      this.aviso.set('Sessão encerrada no servidor.');
    } catch {
      this.aviso.set(
        'O acesso local foi removido, mas a saída no servidor ainda não foi confirmada. Tente encerrar novamente antes de entrar.',
      );
      throw new Error(this.aviso());
    } finally {
      this.encerrando.set(false);
    }
  }
}
