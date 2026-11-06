import { Injectable, WritableSignal, signal } from '@angular/core';
import { Categoria, Oferta, Produto } from './modelos';

export type EdicaoCatalogoPendente =
  | { tipo: 'categoria'; novo: boolean; dados: Categoria }
  | { tipo: 'produto'; novo: boolean; dados: Produto }
  | { tipo: 'oferta'; novo: false; dados: Oferta };

@Injectable({ providedIn: 'root' })
export class CatalogoPendenteService {
  private readonly contas = new Map<string, WritableSignal<EdicaoCatalogoPendente | null>>();

  constructor() {
    window.addEventListener('beforeunload', (event) => {
      if ([...this.contas.values()].some((estado) => estado() !== null)) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  daConta(id: string): WritableSignal<EdicaoCatalogoPendente | null> {
    let estado = this.contas.get(id);
    if (!estado) {
      estado = signal<EdicaoCatalogoPendente | null>(null);
      this.contas.set(id, estado);
    }
    return estado;
  }
}
