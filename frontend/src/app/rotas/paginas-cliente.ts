import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { VitrineComponent } from '../catalogo/vitrine.component';
import { DisponibilidadeComponent } from '../unidades/disponibilidade.component';
import { ParticipanteMesaComponent } from '../mesas/participante-mesa.component';
import { IconeComponent } from './icone.component';
import { MarcaService } from './marca.service';

@Component({
  selector: 'app-pagina-cardapio',
  imports: [VitrineComponent, DisponibilidadeComponent, IconeComponent],
  template: `
    <app-vitrine />
    <details class="service-hours">
      <summary>
        <span class="hours-title">
          <span class="hours-icon" aria-hidden="true"><app-icone nome="relogio" /></span>
          <span>
            <strong>Horários e atendimento</strong>
            <small>Funcionamento das unidades para salão, retirada e entrega</small>
          </span>
        </span>
        <span class="hours-pill">Aberto para consulta</span>
      </summary>
      <div class="hours-body"><app-disponibilidade /></div>
    </details>
  `,
  styles: `
    .service-hours {
      margin-top: 1.75rem;
      border: 1px solid var(--border, #e5ded3);
      border-radius: var(--radius-lg, 1.05rem);
      padding: 0.55rem 1.25rem;
      background: var(--card, #ffffff);
      box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.05));
    }
    .service-hours summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      cursor: pointer;
      min-height: 52px;
      color: var(--foreground, #292521);
      list-style: none;
    }
    .service-hours summary::-webkit-details-marker {
      display: none;
    }
    .hours-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }
    .hours-title > span:last-child {
      display: grid;
      gap: 0.1rem;
    }
    .hours-title strong {
      font-family: var(--font-serif, Georgia, 'Times New Roman', serif);
      font-size: 1rem;
      font-weight: 700;
    }
    .hours-title small {
      color: var(--muted-foreground, #6e6259);
      font-size: 0.78rem;
      font-weight: 500;
    }
    .hours-icon {
      display: grid;
      place-items: center;
      width: 38px;
      height: 38px;
      flex: none;
      border-radius: 50%;
      background: var(--secondary, #f0ebe3);
      color: var(--primary, #a53e2b);
    }
    .hours-icon app-icone {
      width: 18px;
      height: 18px;
    }
    .hours-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      margin-left: auto;
      padding: 0.3rem 0.75rem;
      border-radius: 999px;
      background: var(--accent, #e8efe7);
      color: var(--accent-foreground, #30523b);
      font-size: 0.74rem;
      font-weight: 700;
      white-space: nowrap;
    }
    .service-hours summary::after {
      content: '▾';
      font-size: 0.9rem;
      color: var(--muted-foreground, #6e6259);
      transition: transform 0.16s ease;
    }
    .service-hours[open] > summary {
      border-bottom: 1px dashed var(--border, #e5ded3);
      padding-bottom: 0.65rem;
      margin-bottom: 0.75rem;
    }
    .service-hours[open] > summary::after {
      transform: rotate(180deg);
    }
    @media (max-width: 600px) {
      .service-hours {
        padding: 0.45rem 0.9rem;
      }
      .hours-title small,
      .hours-pill {
        display: none;
      }
    }
  `,
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
  imports: [ParticipanteMesaComponent, IconeComponent],
  template: `
    <header class="mesa-hero">
      <div class="mesa-hero-copy">
        <p class="mesa-eyebrow">{{ marca.nome() }} · ATENDIMENTO NO SALÃO</p>
        <h1>Seu pedido <em>direto da mesa.</em></h1>
        <p class="mesa-lead">
          {{ sloganPontuado() }} Use o código temporário informado pela equipe para entrar na comanda
          compartilhada.
        </p>
      </div>
      <aside class="mesa-passos" aria-label="Como funciona o atendimento à mesa">
        <div class="mesa-passos-topo">
          <span class="mesa-passos-icone" aria-hidden="true"><app-icone nome="mesas" /></span>
          <strong>Fluxo em 3 passos</strong>
        </div>
        <ol class="mesa-passos-lista">
          <li>
            <strong>01. QR Code</strong>
            <span>Mesa identificada</span>
          </li>
          <li>
            <strong>02. Código</strong>
            <span>Passado pela equipe</span>
          </li>
          <li>
            <strong>03. Pedir</strong>
            <span>Sem criar conta</span>
          </li>
        </ol>
      </aside>
    </header>
    <app-participante-mesa [mesaInicial]="mesaId()" />
  `,
  styles: `
    .mesa-hero {
      display: grid;
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.95fr);
      gap: 1.25rem;
      align-items: center;
      margin: 0.75rem 0 1.5rem;
      padding-bottom: 1.35rem;
      border-bottom: 1px dashed var(--border, #e5ded3);
    }
    .mesa-eyebrow {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      text-transform: uppercase;
      color: var(--primary, #a53e2b);
    }
    .mesa-hero h1 {
      margin: 0.35rem 0 0.45rem;
      font-family: var(--font-serif, Georgia, 'Times New Roman', serif);
      font-size: clamp(1.7rem, 3.2vw, 2.35rem);
      font-weight: 600;
      line-height: 1.12;
      letter-spacing: -0.025em;
      color: var(--foreground, #292521);
    }
    .mesa-hero h1 em {
      font-style: italic;
      font-weight: 500;
      color: var(--primary, #a53e2b);
    }
    .mesa-lead {
      margin: 0;
      color: var(--muted-foreground, #6e6259);
      line-height: 1.55;
      font-size: 0.95rem;
    }
    .mesa-passos {
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      border-radius: var(--radius-lg, 1.05rem);
      padding: 0.9rem 1rem;
      box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.05));
    }
    .mesa-passos-topo {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.65rem;
      font-size: 0.84rem;
      color: var(--foreground, #292521);
    }
    .mesa-passos-icone {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--secondary, #f0ebe3);
      color: var(--primary, #a53e2b);
    }
    .mesa-passos-icone app-icone {
      width: 15px;
      height: 15px;
    }
    .mesa-passos-lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
    }
    .mesa-passos-lista li {
      padding: 0.55rem 0.6rem;
      border-radius: 10px;
      background: var(--background, #faf7f2);
      border: 1px solid var(--border, #e5ded3);
      display: grid;
      gap: 0.1rem;
    }
    .mesa-passos-lista strong {
      font-size: 0.72rem;
      color: var(--primary, #a53e2b);
    }
    .mesa-passos-lista span {
      font-size: 0.72rem;
      color: var(--muted-foreground, #6e6259);
      line-height: 1.3;
    }
    @media (max-width: 860px) {
      .mesa-hero {
        grid-template-columns: 1fr;
        gap: 0.9rem;
        margin: 0.45rem 0 1.1rem;
        padding-bottom: 1rem;
      }
    }
    @media (max-width: 600px) {
      .mesa-passos {
        padding: 0.7rem 0.8rem;
      }
      .mesa-passos-topo {
        margin-bottom: 0.45rem;
        font-size: 0.78rem;
      }
      .mesa-passos-lista {
        gap: 0.35rem;
      }
      .mesa-passos-lista li {
        padding: 0.45rem;
      }
    }
  `,
})
export class PaginaMesaComponent {
  readonly marca = inject(MarcaService);
  readonly mesaId = signal<string | undefined>(undefined);
  constructor() {
    const parametros = inject(ActivatedRoute).paramMap.subscribe((params) =>
      this.mesaId.set(params.get('mesaId') ?? undefined),
    );
    inject(DestroyRef).onDestroy(() => parametros.unsubscribe());
  }

  sloganPontuado(): string {
    const s = this.marca.slogan().trim();
    if (!s) return '';
    return /[.!?]$/.test(s) ? s : `${s}.`;
  }
}
