import { Component, inject } from '@angular/core';
import { PlataformaComponent } from '../plataforma/plataforma.component';
import { TemaService } from '../ui/tema.service';
import { IconeComponent } from './icone.component';
@Component({
  selector: 'app-plataforma-layout',
  imports: [PlataformaComponent, IconeComponent],
  template: `
    <header class="plat-header">
      <div class="plat-header-inner">
        <div class="plat-brand">
          <span class="plat-brand-mark" aria-hidden="true">
            <app-icone nome="marca" />
          </span>
          <div class="plat-brand-text">
            <strong>Restaurant Manager</strong>
            <span>Operação isolada multi-tenant</span>
          </div>
        </div>
        <div class="plat-header-right">
          <span class="plat-area-pill">Console SaaS</span>
          <button
            type="button"
            class="tema-btn"
            (click)="alternarTema()"
            [attr.aria-pressed]="temaEscuro()"
            [attr.aria-label]="temaEscuro() ? 'Ativar tema claro' : 'Ativar tema escuro'"
          >
            <app-icone [nome]="temaEscuro() ? 'sol' : 'lua'" />
            <span>{{ temaEscuro() ? 'Claro' : 'Escuro' }}</span>
          </button>
        </div>
      </div>
    </header>
    <main id="conteudo" class="plat-main" tabindex="-1">
      <div class="plat-hero">
        <p class="eyebrow">ADMINISTRAÇÃO DA PLATAFORMA</p>
        <h1>Empresas e provisionamento</h1>
      </div>
      <app-plataforma />
    </main>
  `,
  styles: `
    :host {
      display: block;
      background: var(--background, #faf7f2);
      color: var(--foreground, #292521);
      min-height: 100dvh;
    }
    .plat-header {
      background: var(--card, #ffffff);
      border-bottom: 1px solid var(--border, #e5ded3);
      padding: 0.8rem 1.25rem;
    }
    .plat-header-inner {
      max-width: 1200px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .plat-brand {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
    }
    .plat-brand-mark {
      width: 40px;
      height: 40px;
      border-radius: 0.75rem;
      background: var(--primary-soft, #fbefec);
      border: 1px solid var(--primary-soft-border, #e3bfb7);
      color: var(--primary-ink, #a53e2b);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
    }
    .plat-brand-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .plat-brand-text strong {
      font-size: 0.98rem;
      font-weight: 750;
      letter-spacing: -0.02em;
      color: var(--foreground, #292521);
      line-height: 1.2;
    }
    .plat-brand-text span {
      font-size: 0.76rem;
      color: var(--muted-foreground, #6e6259);
    }
    .plat-header-right {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
    }
    .plat-area-pill {
      display: inline-flex;
      align-items: center;
      min-height: 34px;
      padding: 0.25rem 0.7rem;
      border-radius: 999px;
      background: var(--secondary, #f0ebe3);
      border: 1px solid var(--border, #e5ded3);
      color: var(--secondary-foreground, #44372e);
      font-size: 0.76rem;
      font-weight: 650;
    }
    .tema-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      min-height: 48px;
      padding: 0 0.95rem;
      border-radius: 999px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--secondary, #f0ebe3);
      color: var(--foreground, #292521);
      font: inherit;
      font-size: 0.84rem;
      font-weight: 650;
      cursor: pointer;
    }
    .tema-btn:hover {
      background: var(--muted, #f3eee7);
    }
    .plat-main {
      max-width: 1200px;
      margin: 0 auto;
      padding: clamp(1rem, 3vw, 2.25rem) clamp(0.85rem, 3vw, 1.5rem) 2.5rem;
    }
    .plat-hero {
      margin-bottom: 1.25rem;
    }
    .eyebrow {
      margin: 0 0 0.25rem;
      color: var(--primary-ink, #a53e2b);
      font-size: 0.72rem;
      letter-spacing: 0.12em;
      font-weight: 750;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      font-family: var(--font-serif, 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif);
      font-size: clamp(1.45rem, 3.6vw, 2.15rem);
      letter-spacing: -0.03em;
      line-height: 1.15;
      color: var(--foreground, #292521);
    }
  `,
})
export class PlataformaLayoutComponent {
  private readonly tema = inject(TemaService);
  temaEscuro(): boolean {
    return this.tema.atual() === 'escuro';
  }
  alternarTema(): void {
    this.tema.alternar();
  }
}
