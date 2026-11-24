import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VitrineComponent } from '../catalogo/vitrine.component';
import { DisponibilidadeComponent } from '../unidades/disponibilidade.component';
import { ParticipanteMesaComponent } from '../mesas/participante-mesa.component';
import { SessaoMesaService } from '../mesas/sessao-mesa.service';
import { MarcaService } from './marca.service';

@Component({
  selector: 'app-pagina-cardapio',
  imports: [VitrineComponent, DisponibilidadeComponent],
  template: `<app-vitrine [cardapioCliente]="true"/><details class="service-hours"><summary>Horários e atendimento</summary><app-disponibilidade/></details>`,
  styles: `.service-hours{margin-top:2rem;border-top:1px solid var(--rm-border,#e2e7df);padding-top:1rem}.service-hours summary{font-size:.85rem;font-weight:600;cursor:pointer;min-height:44px;align-content:center;color:var(--rm-muted,#69786c)}`,
})
export class PaginaCardapioComponent {}

@Component({
  selector: 'app-pagina-carrinho',
  imports: [VitrineComponent],
  template: `<app-vitrine modo="carrinho"/>`,
})
export class PaginaCarrinhoComponent {}

@Component({
  selector: 'app-pagina-mesa',
  imports: [ParticipanteMesaComponent],
  template: `
    @if (!mesa.participante()) {
      <header class="mesa-hero">
        <p>{{ marca.nome() }} · Atendimento no salão</p>
        <h1>Seu pedido <em>direto da mesa.</em></h1>
      </header>
    }
    <app-participante-mesa [mesaInicial]="mesaId()" />
  `,
  styles: `
    .mesa-hero { margin: 0 0 1.1rem; }
    .mesa-hero p {
      margin: 0 0 .3rem;
      color: var(--primary-ink);
      font-size: .75rem;
      font-weight: 750;
      letter-spacing: .11em;
      text-transform: uppercase;
    }
    .mesa-hero h1 { margin: 0; font: 500 clamp(1.7rem, 5vw, 2.8rem) / 1.1 var(--font-serif); }
    .mesa-hero em { color: var(--primary-ink); }
  `,
})
export class PaginaMesaComponent {
  readonly marca = inject(MarcaService);
  readonly mesa = inject(SessaoMesaService);
  readonly mesaId = signal<string | undefined>(undefined);
  constructor() {
    const parametros = inject(ActivatedRoute).paramMap.subscribe((params) =>
      this.mesaId.set(params.get('mesaId') ?? undefined),
    );
    inject(DestroyRef).onDestroy(() => parametros.unsubscribe());
  }
}
