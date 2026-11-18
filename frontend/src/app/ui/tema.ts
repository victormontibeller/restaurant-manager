import { signal } from '@angular/core';

export type TemaVisual = 'light' | 'dark';

const CHAVE_TEMA = 'rm-tema';

function lerTemaInicial(): TemaVisual {
  try {
    if (typeof localStorage !== 'undefined') {
      const salvo = localStorage.getItem(CHAVE_TEMA);
      if (salvo === 'dark' || salvo === 'light') return salvo;
    }
    if (typeof document !== 'undefined') {
      const atual = document.documentElement?.dataset?.['theme'];
      if (atual === 'dark' || atual === 'light') return atual;
    }
  } catch {
    /* Ambientes restritos ou sondas sem Web Storage mantêm o tema claro padrão. */
  }
  return 'light';
}

function aplicarNoDocumento(tema: TemaVisual): void {
  try {
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.dataset['theme'] = tema;
      document.documentElement.style.colorScheme = tema;
    }
  } catch {
    /* Ignora em ambientes sem DOM completo. */
  }
}

const estadoTema = signal<TemaVisual>(lerTemaInicial());

export function inicializarTema(): TemaVisual {
  const tema = lerTemaInicial();
  estadoTema.set(tema);
  aplicarNoDocumento(tema);
  return tema;
}

export function temaAtual(): TemaVisual {
  return estadoTema();
}

export function temaEscuro(): boolean {
  return estadoTema() === 'dark';
}

export function definirTema(tema: TemaVisual): void {
  estadoTema.set(tema);
  aplicarNoDocumento(tema);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CHAVE_TEMA, tema);
    }
  } catch {
    /* Falha de armazenamento local não impede a troca visual na sessão. */
  }
}

export function alternarTema(): TemaVisual {
  const proximo: TemaVisual = estadoTema() === 'dark' ? 'light' : 'dark';
  definirTema(proximo);
  return proximo;
}
