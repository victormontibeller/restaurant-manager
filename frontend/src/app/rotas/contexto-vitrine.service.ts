import { Injectable, signal } from '@angular/core';

const CHAVE_UNIDADE = 'rm-unidade-selecionada';

@Injectable({ providedIn: 'root' })
export class ContextoVitrineService {
  readonly unidadeId = signal(this.lerInicial());

  selecionarUnidade(id: string): void {
    const proximo = id.trim();
    this.unidadeId.set(proximo);
    try {
      if (typeof localStorage !== 'undefined') {
        if (proximo) localStorage.setItem(CHAVE_UNIDADE, proximo);
        else localStorage.removeItem(CHAVE_UNIDADE);
      }
    } catch {
      /* Navegador privado ou ambiente sem armazenamento não bloqueia a vitrine. */
    }
  }

  private lerInicial(): string {
    try {
      return typeof localStorage !== 'undefined' ? (localStorage.getItem(CHAVE_UNIDADE) ?? '') : '';
    } catch {
      return '';
    }
  }
}
