import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MarcaService {
  readonly nome = signal('Seu restaurante');
  constructor() {
    void this.carregar();
  }
  private async carregar(): Promise<void> {
    try {
      const resposta = await fetch('/api/v1/restaurante', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!resposta.ok) return;
      const dados: { nome?: string } = await resposta.json();
      if (dados.nome?.trim()) this.nome.set(dados.nome);
    } catch {
      /* O cardápio continua acessível com a marca neutra. */
    }
  }
}
