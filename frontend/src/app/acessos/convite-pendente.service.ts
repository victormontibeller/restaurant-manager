import { Injectable, signal, WritableSignal } from '@angular/core';

export interface ConviteIntencao {
  id: string;
  email: string;
  perfil: string;
  unidades: string[];
  incerta: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConvitePendenteService {
  private readonly contas = new Map<string, WritableSignal<ConviteIntencao | null>>();

  constructor() {
    // A intenção sobrevive ao logout; o aviso também precisa sobreviver à tela.
    window.addEventListener('beforeunload', (event) => {
      if ([...this.contas.values()].some((pendente) => pendente())) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  daConta(id: string): WritableSignal<ConviteIntencao | null> {
    const chave = location.origin + '|' + id;
    let valor = this.contas.get(chave);
    if (!valor) {
      valor = signal<ConviteIntencao | null>(null);
      this.contas.set(chave, valor);
    }
    return valor;
  }
}
