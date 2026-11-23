import { Injectable, computed, signal } from '@angular/core';

interface RespostaMarcaPublica {
  nome?: unknown;
  logoUrl?: unknown;
  bannerUrl?: unknown;
  slogan?: unknown;
}

function urlSeguraImagem(valor: unknown): string | null {
  if (typeof valor !== 'string') return null;
  const limpa = valor.trim();
  if (!limpa || limpa.length > 500 || /["'()\\\r\n]/.test(limpa)) return null;
  if (limpa.startsWith('/')) return limpa.startsWith('//') ? null : limpa;
  try {
    const url = new URL(limpa);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class MarcaService {
  readonly nome = signal('Seu restaurante');
  readonly logoUrl = signal<string | null>(null);
  readonly bannerUrl = signal<string | null>(null);
  readonly slogan = signal('Bom de escolher. Melhor de saborear.');
  readonly erroLogo = signal(false);
  readonly bannerCss = computed(() => {
    const url = this.bannerUrl();
    return url ? `url("${url}")` : null;
  });
  readonly iniciais = computed(() => {
    const partes = this.nome().trim().split(/\s+/).filter(Boolean);
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return (partes[0]?.slice(0, 2) || 'SR').toUpperCase();
  });

  constructor() {
    void this.carregar();
  }

  marcarErroLogo(): void {
    this.erroLogo.set(true);
  }

  private async carregar(): Promise<void> {
    try {
      const resposta = await fetch('/api/v1/restaurante', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (!resposta.ok) return;
      const dados = (await resposta.json()) as RespostaMarcaPublica;
      if (typeof dados.nome === 'string' && dados.nome.trim()) this.nome.set(dados.nome.trim());
      if (typeof dados.slogan === 'string' && dados.slogan.trim()) {
        this.slogan.set(dados.slogan.trim().slice(0, 120));
      }
      const logo = urlSeguraImagem(dados.logoUrl);
      if (logo) {
        this.erroLogo.set(false);
        this.logoUrl.set(logo);
      }
      const banner = urlSeguraImagem(dados.bannerUrl);
      if (banner) this.bannerUrl.set(banner);
    } catch {
      /* O cardápio continua acessível com a marca neutra. */
    }
  }
}
