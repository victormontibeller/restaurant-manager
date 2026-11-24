import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HlmButton } from '../ui/button';
import { IconeComponent } from './icone.component';
import { MarcaService } from './marca.service';

@Component({
  selector: 'app-pagina-informativa',
  imports: [RouterLink, HlmButton, IconeComponent],
  template: `
    <div class="info-shell">
      <section class="info-card" [attr.aria-labelledby]="'info-titulo'">
        <div class="info-grid">
          <div class="info-principal">
            <div class="info-topo">
              <div class="info-marca">
                @if (marca.logoUrl() && !marca.erroLogo()) {
                  <img
                    class="info-logo"
                    [src]="marca.logoUrl()"
                    [alt]="marca.nome()"
                    width="36"
                    height="36"
                    decoding="async"
                    (error)="marca.marcarErroLogo()"
                  />
                } @else {
                  <span class="info-symbol" aria-hidden="true">
                    <app-icone nome="marca" />
                  </span>
                }
                <span class="info-casa">{{ marca.nome() }}</span>
              </div>

              <span class="info-ilustracao" [class.acesso]="acesso" aria-hidden="true">
                <app-icone [nome]="acesso ? 'conta' : 'cardapio'" />
              </span>
            </div>

            <p class="bistro-eyebrow">
              {{ acesso ? 'ÁREA DA EQUIPE' : 'VAMOS VOLTAR AO CARDÁPIO?' }}
            </p>

            <h1 id="info-titulo">
              @if (acesso) {
                Esta área não <em>está no seu acesso.</em>
              } @else {
                Essa página <em>saiu do cardápio.</em>
              }
            </h1>

            <hr class="bistro-divider-dotted" aria-hidden="true" />

            <p class="info-descricao">
              {{
                acesso
                  ? 'Seu perfil e suas unidades determinam as áreas disponíveis. Fale com a administração se precisar de outro acesso.'
                  : 'O endereço pode ter mudado. Você pode continuar escolhendo seu próximo pedido.'
              }}
            </p>

            <div class="info-acoes">
              <a hlmBtn routerLink="/cardapio">Ver cardápio</a>
              <a hlmBtn variant="outline" routerLink="/conta">Minha conta</a>
              @if (acesso) {
                <a hlmBtn variant="secondary" routerLink="/gestao/entrar">Área da equipe</a>
              }
            </div>
          </div>

          <aside class="info-atalhos" aria-label="Atalhos da casa">
            <div class="atalhos-cabeca">
              <p class="atalhos-kicker">Atalhos da casa · Navegação rápida</p>
              <p class="atalhos-sub">Escolha um caminho direto para continuar na casa:</p>
            </div>

            <nav class="atalhos-lista" aria-label="Navegação rápida">
              <a class="atalho-linha" routerLink="/cardapio">
                <span class="atalho-nome">
                  <app-icone nome="cardapio" aria-hidden="true" />
                  <span>Cardápio da casa</span>
                </span>
                <span class="atalho-pontos" aria-hidden="true"></span>
                <span class="atalho-destino">
                  <span>Abrir</span>
                  <app-icone nome="seta" aria-hidden="true" />
                </span>
              </a>

              <a class="atalho-linha" routerLink="/carrinho">
                <span class="atalho-nome">
                  <app-icone nome="sacola" aria-hidden="true" />
                  <span>Minha sacola</span>
                </span>
                <span class="atalho-pontos" aria-hidden="true"></span>
                <span class="atalho-destino">
                  <span>Revisar</span>
                  <app-icone nome="seta" aria-hidden="true" />
                </span>
              </a>

              <a class="atalho-linha" routerLink="/mesa">
                <span class="atalho-nome">
                  <app-icone nome="mesas" aria-hidden="true" />
                  <span>Comanda na mesa</span>
                </span>
                <span class="atalho-pontos" aria-hidden="true"></span>
                <span class="atalho-destino">
                  <span>Acessar</span>
                  <app-icone nome="seta" aria-hidden="true" />
                </span>
              </a>

              <a class="atalho-linha" routerLink="/pedidos">
                <span class="atalho-nome">
                  <app-icone nome="pedidos" aria-hidden="true" />
                  <span>Acompanhar pedidos</span>
                </span>
                <span class="atalho-pontos" aria-hidden="true"></span>
                <span class="atalho-destino">
                  <span>Ver status</span>
                  <app-icone nome="seta" aria-hidden="true" />
                </span>
              </a>
            </nav>

            <p class="atalhos-rodape">
              Precisa de ajuda? Fale com a equipe do balcão ou administração.
            </p>
          </aside>
        </div>
      </section>
    </div>
  `,
  styles: `
    .info-shell {
      padding: clamp(1rem, 4vw, 3rem) 1rem;
    }
    .info-card {
      max-width: 960px;
      margin: 0 auto;
      padding: clamp(1.1rem, 3vw, 2rem);
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      border-top: 4px solid var(--primary, #a53e2b);
      border-radius: var(--radius-lg, 1.05rem);
      box-shadow: 0 12px 34px -20px rgba(41, 37, 33, 0.22);
    }
    .info-grid {
      display: grid;
      gap: 1.35rem;
      min-width: 0;
    }
    .info-principal {
      display: grid;
      gap: 0.7rem;
      align-content: start;
      text-align: left;
      min-width: 0;
    }
    .info-topo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      flex-wrap: wrap;
      margin-bottom: 0.25rem;
    }
    .info-marca {
      display: inline-flex;
      align-items: center;
      gap: 0.6rem;
      min-width: 0;
      padding: 0.35rem 0.9rem 0.35rem 0.45rem;
      border: 1px solid var(--border, #e5ded3);
      border-radius: 999px;
      background: var(--background, #faf7f2);
    }
    .info-logo {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      object-fit: cover;
      border: 1px solid var(--border, #e5ded3);
      flex-shrink: 0;
    }
    .info-symbol {
      display: inline-grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: var(--primary, #a53e2b);
      color: var(--primary-foreground, #ffffff);
      box-shadow:
        inset 0 0 0 2px var(--primary, #a53e2b),
        inset 0 0 0 3px #f3d9d2;
      flex-shrink: 0;
    }
    .info-symbol app-icone {
      width: 16px;
      height: 16px;
    }
    .info-casa {
      font-family: var(--font-serif, Georgia, serif);
      font-size: 0.96rem;
      font-weight: 700;
      color: var(--foreground, #292521);
      overflow-wrap: anywhere;
    }
    .info-ilustracao {
      display: grid;
      place-items: center;
      width: 54px;
      height: 60px;
      border-radius: 999px 999px 14px 14px;
      background: var(--secondary, #f0ebe3);
      border: 1px solid var(--border, #dfd3c3);
      color: var(--primary-ink, #a53e2b);
      flex-shrink: 0;
    }
    .info-ilustracao.acesso {
      background: var(--muted, #f3eee7);
      color: var(--secondary-foreground, #44372e);
    }
    .info-ilustracao app-icone {
      width: 24px;
      height: 24px;
    }
    .bistro-eyebrow {
      margin: 0;
    }
    h1 {
      margin: 0;
      font-family: var(--font-serif, Georgia, serif);
      font-size: clamp(1.72rem, 3.4vw, 2.35rem);
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.025em;
      color: var(--foreground, #292521);
    }
    h1 em {
      font-style: italic;
      color: var(--primary-ink, #7f2f20);
    }
    .bistro-divider-dotted {
      margin: 0.2rem 0;
    }
    .info-descricao {
      margin: 0;
      max-width: 48ch;
      color: var(--muted-foreground, #6e6259);
      line-height: 1.6;
    }
    .info-acoes {
      display: flex;
      justify-content: flex-start;
      gap: 0.65rem;
      flex-wrap: wrap;
      margin-top: 0.65rem;
    }
    .info-acoes a[hlmBtn] {
      min-height: 48px;
      padding-inline: 1.15rem;
    }
    .info-acoes a[hlmBtn]:not([data-variant]),
    .info-acoes a[hlmBtn][data-variant='default'] {
      background: var(--primary, #a53e2b);
      border: 1px solid var(--primary-deep, #7f2f20);
      color: #ffffff;
      border-radius: 14px;
      box-shadow: 0 3px 0 var(--primary-deep, #7f2f20);
    }
    .info-acoes a[hlmBtn]:not([data-variant]):hover,
    .info-acoes a[hlmBtn][data-variant='default']:hover {
      background: var(--primary-hover, #933524);
    }
    .info-acoes a[hlmBtn][data-variant='outline'] {
      background: var(--card, #ffffff);
      border: 1px solid var(--border, #e5ded3);
      color: var(--foreground, #292521);
      border-radius: 14px;
      box-shadow: 0 2px 0 var(--border, #ddd4c7);
    }
    .info-acoes a[hlmBtn][data-variant='outline']:hover {
      background: var(--muted, #f3eee7);
    }
    .info-acoes a[hlmBtn][data-variant='secondary'] {
      background: var(--secondary, #f0ebe3);
      border: 1px solid var(--border, #d8cfc3);
      color: var(--foreground, #292521);
      border-radius: 14px;
      box-shadow: 0 2px 0 var(--border, #ddd4c7);
    }
    .info-acoes a[hlmBtn][data-variant='secondary']:hover {
      background: var(--muted, #e7dfd3);
    }
    .info-atalhos {
      display: grid;
      gap: 0.85rem;
      align-content: start;
      min-width: 0;
      padding: 1.1rem;
      border-radius: 16px;
      border: 1px dashed var(--input, #d5cbbd);
      background: var(--background, #faf7f2);
    }
    .atalhos-cabeca {
      display: grid;
      gap: 0.2rem;
    }
    .atalhos-kicker {
      margin: 0;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.13em;
      text-transform: uppercase;
      color: var(--primary-ink, #a53e2b);
    }
    .atalhos-sub {
      margin: 0;
      font-size: 0.85rem;
      color: var(--muted-foreground, #6e6259);
      line-height: 1.45;
    }
    .atalhos-lista {
      display: grid;
      gap: 0.4rem;
    }
    .atalho-linha {
      display: grid;
      grid-template-columns: auto minmax(12px, 1fr) auto;
      align-items: center;
      gap: 0.5rem;
      min-height: 48px;
      padding: 0.45rem 0.65rem;
      border-radius: 12px;
      border: 1px solid transparent;
      background: var(--card, #ffffff);
      color: var(--foreground, #292521);
      text-decoration: none;
      font-size: 0.9rem;
      font-weight: 600;
      transition:
        border-color 0.15s ease,
        background-color 0.15s ease;
    }
    .atalho-linha:hover,
    .atalho-linha:focus-visible {
      border-color: var(--primary-ink, #a53e2b);
      background: var(--popover, #fffdfb);
      outline: none;
    }
    .atalho-linha:focus-visible {
      box-shadow: 0 0 0 3px var(--primary-soft, #a53e2b33);
    }
    .atalho-nome {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: var(--foreground, #292521);
    }
    .atalho-nome app-icone {
      width: 17px;
      height: 17px;
      color: var(--primary-ink, #a53e2b);
      flex-shrink: 0;
    }
    .atalho-pontos {
      border-bottom: 1px dotted var(--input, #cfc3b3);
      height: 1px;
      transform: translateY(2px);
    }
    .atalho-destino {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--primary-ink, #7f2f20);
    }
    .atalho-destino app-icone {
      width: 14px;
      height: 14px;
    }
    .atalhos-rodape {
      margin: 0.15rem 0 0;
      padding-top: 0.65rem;
      border-top: 1px dashed var(--border, #e5ded3);
      font-size: 0.82rem;
      line-height: 1.48;
      color: var(--muted-foreground, #6e6259);
    }
    @media (min-width: 820px) {
      .info-grid {
        grid-template-columns: 1.15fr 0.85fr;
        align-items: start;
        gap: 1.75rem;
      }
    }
    @media (max-width: 600px) {
      .info-shell {
        padding: 0.9rem 0.75rem;
      }
      .info-card {
        padding: 1rem;
      }
      .info-acoes {
        flex-direction: column;
      }
      .info-acoes a[hlmBtn] {
        width: 100%;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .atalho-linha {
        transition: none;
      }
    }
  `,
})
export class PaginaInformativaComponent {
  readonly marca = inject(MarcaService);
  readonly acesso = inject(ActivatedRoute).snapshot.data['semAcesso'] === true;
}
