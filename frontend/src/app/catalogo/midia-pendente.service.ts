import { Injectable, WritableSignal, signal } from '@angular/core';
import { Produto } from './modelos';

export interface EnvioMidiaPendente {
  id: string;
  arquivo: File;
  produto: Produto;
  novo: boolean;
}

@Injectable({ providedIn: 'root' })
export class MidiaPendenteService {
  private readonly contas = new Map<string, WritableSignal<EnvioMidiaPendente | null>>();

  constructor() {
    window.addEventListener('beforeunload', (event) => {
      if ([...this.contas.values()].some((estado) => estado() !== null)) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  daConta(id: string): WritableSignal<EnvioMidiaPendente | null> {
    let estado = this.contas.get(id);
    if (!estado) {
      estado = signal<EnvioMidiaPendente | null>(null);
      this.contas.set(id, estado);
    }
    return estado;
  }
}
