import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';

type Tema = 'claro' | 'escuro';
const PREFERENCIA = 'rm-tema-gestao';

@Injectable({ providedIn: 'root' })
export class TemaService {
  private readonly documento = inject(DOCUMENT);
  private readonly navegador = this.documento.defaultView;
  readonly atual = signal<Tema>('claro');

  constructor() {
    try {
      this.aplicar(this.navegador?.localStorage.getItem(PREFERENCIA));
    } catch {
      this.aplicar(null);
    }
    const sincronizar = (evento: StorageEvent) => {
      if (evento.key === PREFERENCIA || evento.key === null) this.aplicar(evento.newValue);
    };
    this.navegador?.addEventListener('storage', sincronizar);
    inject(DestroyRef).onDestroy(() => this.navegador?.removeEventListener('storage', sincronizar));
  }

  alternar(): void {
    this.aplicar(this.atual() === 'escuro' ? 'claro' : 'escuro');
    try {
      this.navegador?.localStorage.setItem(PREFERENCIA, this.atual());
    } catch {
      // A escolha continua disponível durante a navegação desta aba.
    }
  }

  private aplicar(valor: string | null | undefined): void {
    const tema = valor === 'escuro' ? 'escuro' : 'claro';
    this.atual.set(tema);
    this.documento.documentElement.dataset['tema'] = tema;
  }
}
