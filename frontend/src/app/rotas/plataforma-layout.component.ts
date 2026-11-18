import { Component } from '@angular/core';
import { PlataformaComponent } from '../plataforma/plataforma.component';
import * as Tema from '../ui/tema';
import { IconeComponent } from './icone.component';
@Component({
  selector: 'app-plataforma-layout',
  imports: [PlataformaComponent, IconeComponent],
  template: `<header><app-icone nome="marca"/><strong>Restaurant Manager</strong><span>Plataforma</span><button type="button" class="tema-btn" (click)="alternarTema()" [attr.aria-pressed]="temaEscuro()" [attr.aria-label]="temaEscuro() ? 'Ativar tema claro' : 'Ativar tema escuro'"><app-icone [nome]="temaEscuro() ? 'sol' : 'lua'"/><span>{{ temaEscuro() ? 'Claro' : 'Escuro' }}</span></button></header><main id="conteudo" tabindex="-1"><p class="eyebrow">ADMINISTRAÇÃO DA PLATAFORMA</p><h1>Empresas e provisionamento</h1><app-plataforma/></main>`,
  styles: `:host{display:block;background:var(--background,#faf7f2);color:var(--foreground,#292521);min-height:100dvh}header{display:flex;align-items:center;gap:.8rem;flex-wrap:wrap;padding:1rem 1.5rem;background:var(--card,#ffffff);border-bottom:1px solid var(--border,#e5ded3)}header>span{margin-left:auto;color:var(--muted-foreground,#6e6259);font-size:.85rem}.tema-btn{display:inline-flex;align-items:center;gap:.45rem;min-height:44px;padding:0 .85rem;border-radius:999px;border:1px solid var(--border,#e5ded3);background:var(--secondary,#f0ebe3);color:var(--foreground,#292521);font:inherit;font-size:.82rem;font-weight:650;cursor:pointer}main{max-width:1200px;margin:auto;padding:clamp(1rem,4vw,3rem)}.eyebrow{color:var(--primary,#a53e2b);font-size:.7rem;letter-spacing:.12em;font-weight:700}h1{font-size:clamp(1.6rem,4vw,2.4rem);letter-spacing:-.04em;margin:.75rem 0 1.75rem}`,
})
export class PlataformaLayoutComponent {
  temaEscuro(): boolean {
    return Tema.temaEscuro?.() ?? false;
  }
  alternarTema(): void {
    Tema.alternarTema?.();
  }
}
