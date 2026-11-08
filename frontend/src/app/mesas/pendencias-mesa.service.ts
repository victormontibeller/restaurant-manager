import { Injectable, signal } from '@angular/core';

export interface CriacaoMesaPendente {
  id: string;
  unidadeId: string;
  nome: string;
}

export interface SolicitacaoMesaPendente {
  intencaoId: string;
  tipo: 'AJUDA' | 'CONTA';
  participante: string;
}

/** Intenções privadas em memória: trocar de tela não pode fabricar outra operação. */
@Injectable({ providedIn: 'root' })
export class PendenciasMesaService {
  readonly alteracao = signal(0);
  private readonly criacoes = new Map<string, CriacaoMesaPendente>();
  private readonly aberturas = new Map<string, string>();
  private readonly solicitacoes = new Map<string, SolicitacaoMesaPendente>();

  constructor() {
    window.addEventListener('beforeunload', (event) => {
      if (this.criacoes.size || this.aberturas.size || this.solicitacoes.size) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  criacao(contexto: string): CriacaoMesaPendente | null {
    this.alteracao();
    return this.criacoes.get(contexto) ?? null;
  }

  guardarCriacao(contexto: string, intencao: CriacaoMesaPendente): void {
    this.criacoes.set(contexto, structuredClone(intencao));
    this.alteracao.update((valor) => valor + 1);
  }

  concluirCriacao(contexto: string): void {
    this.criacoes.delete(contexto);
    this.alteracao.update((valor) => valor + 1);
  }

  abertura(contexto: string, mesaId: string): string | null {
    this.alteracao();
    return this.aberturas.get(contexto + ':' + mesaId) ?? null;
  }

  guardarAbertura(contexto: string, mesaId: string, intencaoId: string): void {
    this.aberturas.set(contexto + ':' + mesaId, intencaoId);
    this.alteracao.update((valor) => valor + 1);
  }

  concluirAbertura(contexto: string, mesaId: string): void {
    this.aberturas.delete(contexto + ':' + mesaId);
    this.alteracao.update((valor) => valor + 1);
  }

  solicitacao(participante: string): SolicitacaoMesaPendente | null {
    this.alteracao();
    return this.solicitacoes.get(location.origin + ':' + participante) ?? null;
  }

  guardarSolicitacao(intencao: SolicitacaoMesaPendente): void {
    this.solicitacoes.set(location.origin + ':' + intencao.participante, structuredClone(intencao));
    this.alteracao.update((valor) => valor + 1);
  }

  concluirSolicitacao(participante: string): void {
    this.solicitacoes.delete(location.origin + ':' + participante);
    this.alteracao.update((valor) => valor + 1);
  }
}
