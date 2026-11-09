import { Component } from '@angular/core';
import { PlataformaComponent } from '../plataforma/plataforma.component';
import { IconeComponent } from './icone.component';
@Component({
  selector: 'app-plataforma-layout',
  imports: [PlataformaComponent, IconeComponent],
  template: `<header><app-icone nome="marca"/><strong>Restaurant Manager</strong><span>Plataforma</span></header><main id="conteudo" tabindex="-1"><p class="eyebrow">ADMINISTRAÇÃO DA PLATAFORMA</p><h1>Empresas e provisionamento</h1><app-plataforma/></main>`,
  styles: `:host{display:block;background:var(--rm-bg,#f7f8f4);min-height:100dvh}header{display:flex;align-items:center;gap:.8rem;padding:1.5rem 2rem;background:#fff;border-bottom:1px solid var(--rm-border,#e2e7df)}header span{margin-left:auto;color:var(--rm-muted,#6b746c);font-size:.85rem}main{max-width:1200px;margin:auto;padding:clamp(1rem,4vw,3rem)}.eyebrow{color:var(--rm-primary,#285139);font-size:.7rem;letter-spacing:.12em;font-weight:700}h1{font-size:2.4rem;letter-spacing:-.04em;margin:1rem 0 2rem}`,
})
export class PlataformaLayoutComponent {}
