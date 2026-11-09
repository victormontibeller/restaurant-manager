import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NavegacaoProtegidaService {
  readonly aviso = signal('');
  private readonly bloqueios = new Set<string>();
  private readonly rascunhos = new Map<string, () => boolean>();
  private saidaSegura = false;

  constructor() {
    window.addEventListener('beforeunload', (event) => {
      if (this.bloqueios.size || [...this.rascunhos.values()].some((alterado) => alterado())) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  bloquear(chave: string, bloqueado: boolean): void {
    if (bloqueado) this.bloqueios.add(chave);
    else this.bloqueios.delete(chave);
  }

  liberar(chave: string): void {
    this.bloqueios.delete(chave);
  }

  registrarRascunho(chave: string, alterado: () => boolean): void {
    this.rascunhos.set(chave, alterado);
  }

  retirarRascunho(chave: string): void {
    this.rascunhos.delete(chave);
  }

  permitirLogout(): void {
    // Encerrar credenciais nunca depende de concluir uma operação de negócio.
    this.saidaSegura = true;
  }

  concluirNavegacao(): void {
    this.saidaSegura = false;
    this.aviso.set('');
  }

  impedirSaida(): boolean {
    if (this.saidaSegura) return false;
    if (this.bloqueios.size) {
      this.aviso.set('Aguarde a operação ou confira o resultado pendente antes de mudar de tela.');
      return true;
    }
    if (
      [...this.rascunhos.values()].some((alterado) => alterado()) &&
      !window.confirm('Há alterações ainda não salvas. Deseja sair desta tela e descartá-las?')
    )
      return true;
    return false;
  }
}
