import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VitrineComponent } from '../catalogo/vitrine.component';
import { DisponibilidadeComponent } from '../unidades/disponibilidade.component';
import { ParticipanteMesaComponent } from '../mesas/participante-mesa.component';

@Component({
  selector: 'app-pagina-cardapio',
  imports: [VitrineComponent, DisponibilidadeComponent],
  template: `<app-vitrine/><details class="service-hours"><summary>Horários e atendimento</summary><app-disponibilidade/></details>`,
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
  template: `<header class="mesa-heading"><p>À MESA, DO SEU JEITO</p><h1>Seu atendimento</h1><span>Acompanhe seus pedidos e fale com a equipe sem sair do lugar.</span></header><app-participante-mesa [mesaInicial]="mesaId()"/>`,
  styles: `.mesa-heading{margin:1rem 0 2rem}.mesa-heading p{font-size:.7rem;font-weight:700;letter-spacing:.13em;color:var(--rm-primary,#285139)}h1{font-size:2.4rem;letter-spacing:-.04em;margin:.5rem 0}.mesa-heading span{color:var(--rm-muted,#69786c)}`,
})
export class PaginaMesaComponent {
  readonly mesaId = signal<string | undefined>(undefined);
  constructor() {
    const parametros = inject(ActivatedRoute).paramMap.subscribe((params) =>
      this.mesaId.set(params.get('mesaId') ?? undefined),
    );
    inject(DestroyRef).onDestroy(() => parametros.unsubscribe());
  }
}
