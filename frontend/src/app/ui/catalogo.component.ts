import { Component, signal } from '@angular/core';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from './button';
import { RM_TABS } from './tabs';

interface TokenPaleta {
  nome: string;
  hex: string;
  uso: string;
}

@Component({
  selector: 'app-catalogo-ui',
  imports: [HlmButton, RM_TABS, IconeComponent],
  template: `
    <main id="conteudo" tabindex="-1" class="ui-catalogo">
      <header class="ui-hero">
        <div class="ui-hero-topo">
          <span class="ui-selo-simbolo" aria-hidden="true">
            <app-icone nome="marca" />
          </span>
          <div class="ui-hero-titulo">
            <div class="ui-hero-kicker">
              <p class="eyebrow">ROTA INTERNA · GUIA DE INTERFACE</p>
              <span class="ui-pill">Referência técnica de componentes</span>
            </div>
            <h1>Sistema Visual &amp; Componentes</h1>
          </div>
        </div>
        <p class="ui-lead">
          Tela interna de auditoria para validar a paleta fixa do produto, o contraste WCAG AA,
          botões táteis e acessibilidade de teclado. Não altera cores de clientes (personalização de
          logo e marca por restaurante pertence ao painel administrativo via BE-02).
        </p>
      </header>

      <section>
        <div class="ui-sec-head">
          <span class="ui-num">01 / 06</span>
          <h2>Paleta oficial e papelaria</h2>
        </div>
        <div class="paleta-grid">
          @for (token of paleta; track token.nome) {
            <article class="swatch-card">
              <div class="swatch-cor" [style.background]="token.hex" aria-hidden="true"></div>
              <div class="swatch-info">
                <strong>{{ token.nome }}</strong>
                <code>{{ token.hex }}</code>
                <span>{{ token.uso }}</span>
              </div>
            </article>
          }
        </div>
        <hr class="bistro-divider-dotted" aria-hidden="true" />
        <article class="bistro-talao">
          <p class="bistro-eyebrow">EXEMPLO DE TALÃO EDITORIAL · 01/02</p>
          <p class="ui-serif-amostra">
            Tipografia serifada para títulos de mesa e sans-serif legível para operação contínua.
          </p>
          <p class="bistro-callout">
            Dica: guias pontilhadas e borda superior terracota separam blocos sem peso visual.
          </p>
        </article>
      </section>

      <section>
        <div class="ui-sec-head">
          <span class="ui-num">02 / 06</span>
          <h2>Ações e foco</h2>
        </div>
        <div class="acoes">
          <button
            type="button"
            hlmBtn
            (click)="acaoShowcase.set('Ação primária selecionada (Confirmar pedido).')"
          >
            Confirmar pedido
          </button>
          <button
            type="button"
            hlmBtn
            variant="secondary"
            (click)="acaoShowcase.set('Ação secundária selecionada (Ver detalhes).')"
          >
            Ver detalhes
          </button>
          <button
            type="button"
            hlmBtn
            variant="outline"
            (click)="acaoShowcase.set('Ação de contorno selecionada (Voltar).')"
          >
            Voltar
          </button>
          <button
            type="button"
            hlmBtn
            variant="ghost"
            (click)="acaoShowcase.set('Ação discreta selecionada (Cancelar).')"
          >
            Cancelar
          </button>
          <button
            type="button"
            hlmBtn
            variant="destructive"
            (click)="acaoShowcase.set('Ação destrutiva selecionada (Remover).')"
          >
            Remover
          </button>
          <button type="button" hlmBtn disabled>Enviando…</button>
        </div>
        @if (acaoShowcase()) {
          <p class="ui-showcase-feedback" role="status">{{ acaoShowcase() }}</p>
        }
      </section>

      <section>
        <div class="ui-sec-head">
          <span class="ui-num">03 / 06</span>
          <h2>Campos e validação</h2>
        </div>
        <div class="ui-campos">
          <div>
            <label for="ui-nome">Nome da mesa</label>
            <input id="ui-nome" placeholder="Ex.: Varanda 02" />
          </div>
          <div>
            <label for="ui-unidade">Unidade</label>
            <div class="bistro-select-wrap" (focusout)="fecharSeletorSeSaiu($event)">
              <label
                class="bistro-select-pill"
                [class.open]="seletorAberto()"
                for="ui-unidade"
                (mousedown)="$event.preventDefault()"
                (click)="$event.preventDefault(); selUnidade.focus(); alternarSeletor()"
              >
                <span class="bistro-select-val" aria-hidden="true">{{ unidadeSelecionada() }}</span>
                <select
                  #selUnidade
                  id="ui-unidade"
                  class="sr-only"
                  [value]="unidadeSelecionada()"
                  (keydown.enter)="$event.preventDefault(); alternarSeletor()"
                  (keydown.space)="$event.preventDefault(); alternarSeletor()"
                  (keydown.escape)="seletorAberto.set(false)"
                  (change)="aoMudarSelect($event)"
                >
                  @for (u of unidades; track u) {
                    <option [value]="u" [selected]="unidadeSelecionada() === u">{{ u }}</option>
                  }
                </select>
                <svg
                  class="bistro-select-chev"
                  [class.rot]="seletorAberto()"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </label>
              @if (seletorAberto()) {
                <div class="bistro-select-popover">
                  @for (u of unidades; track u) {
                    <button
                      type="button"
                      class="bistro-select-opt"
                      [class.on]="unidadeSelecionada() === u"
                      (mousedown)="$event.preventDefault()"
                      (click)="selecionarUnidade(u, selUnidade); selUnidade.focus()"
                    >
                      {{ u }}
                    </button>
                  }
                </div>
              }
            </div>
          </div>
        </div>
        <p class="erro" role="status">Exemplo de validação: informe um nome para continuar.</p>
      </section>

      <section brnTabs="ui-fila" activationMode="manual">
        <div class="ui-sec-head">
          <span class="ui-num">04 / 06</span>
          <h2>Abas e teclado</h2>
        </div>
        <div brnTabsList class="rm-tabs-list ui-tabs-3" aria-label="Exemplo de etapas">
          <button type="button" brnTabsTrigger="ui-fila">Fila</button>
          <button type="button" brnTabsTrigger="ui-preparo">Preparo</button>
          <button type="button" brnTabsTrigger="ui-prontos">Prontos</button>
        </div>
        <div brnTabsContent="ui-fila" class="ui-tab-panel">Nenhum pedido na fila.</div>
        <div brnTabsContent="ui-preparo" class="ui-tab-panel">
          Pedidos em preparo aparecem aqui.
        </div>
        <div brnTabsContent="ui-prontos" class="ui-tab-panel">Pedidos prontos aparecem aqui.</div>
      </section>

      <section>
        <div class="ui-sec-head">
          <span class="ui-num">05 / 06</span>
          <h2>Estados operacionais</h2>
        </div>
        <div class="acoes">
          <span class="badge bistro-badge">Aguardando aceite</span>
          <span class="badge badge-verde bistro-badge bistro-badge-ok">Pronto</span>
          <span class="badge badge-ambar bistro-badge bistro-badge-warn">Em preparo</span>
        </div>
        <p class="aviso">Sem conexão. As informações podem estar desatualizadas.</p>
        <p class="vazio bistro-empty">Nenhum pedido nesta etapa.</p>
        <details class="bistro-details">
          <summary>Acordeão padrão de utilidades e horários</summary>
          <div class="bistro-details-body">
            Cabeçalho com alvo mínimo de 48px, marcador limpo e guia pontilhada na abertura.
          </div>
        </details>
      </section>

      <section>
        <div class="ui-sec-head">
          <span class="ui-num">06 / 06</span>
          <h2>Diálogo</h2>
        </div>
        <button
          #gatilhoDialogo
          type="button"
          hlmBtn
          variant="outline"
          (click)="dialogo.showModal()"
        >
          Abrir exemplo
        </button>
        <dialog
          #dialogo
          aria-labelledby="ui-dialogo-titulo"
          (cancel)="agendarRetornoFoco(gatilhoDialogo)"
        >
          <p class="bistro-eyebrow">CONFIRMAÇÃO</p>
          <h2 id="ui-dialogo-titulo">Confirmar alteração</h2>
          <p>Confira a unidade antes de continuar.</p>
          <hr class="bistro-divider-dotted" aria-hidden="true" />
          <div class="acoes">
            <button type="button" hlmBtn (click)="fecharDialogo(dialogo, gatilhoDialogo)">
              Entendi
            </button>
          </div>
        </dialog>
      </section>
    </main>
  `,
  styles: `
    .ui-hero {
      padding: clamp(1rem, 3vw, 1.5rem);
      margin-bottom: 1.25rem;
      background: var(--card);
      border: 1px solid var(--border);
      border-top: 4px solid var(--primary);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-soft);
    }
    .ui-hero-topo {
      display: flex;
      align-items: flex-start;
      gap: 0.9rem;
      flex-wrap: wrap;
    }
    .ui-hero-titulo {
      min-width: 0;
      flex: 1 1 220px;
    }
    .ui-hero-kicker {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
      margin-bottom: 0.25rem;
    }
    .ui-hero-kicker .eyebrow {
      margin: 0;
    }
    .ui-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      border: 1px solid var(--border, #dfd3c3);
      background: var(--secondary);
      color: var(--foreground);
      font-size: 0.74rem;
      font-weight: 700;
    }
    .ui-selo-simbolo {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--primary);
      color: var(--primary-foreground);
      box-shadow:
        inset 0 0 0 3px var(--primary),
        inset 0 0 0 4px #f3d9d2;
      flex-shrink: 0;
    }
    .ui-hero h1 {
      margin: 0.2rem 0 0;
      font-family: var(--font-serif);
      font-size: clamp(1.7rem, 3.6vw, 2.55rem);
      font-weight: 600;
      line-height: 1.15;
    }
    .ui-lead {
      margin: 0.85rem 0 0;
      color: var(--muted-foreground);
      line-height: 1.55;
      max-width: 72ch;
    }
    .ui-sec-head {
      display: grid;
      gap: 0.25rem;
      margin-bottom: 1rem;
    }
    .ui-sec-head h2 {
      margin: 0;
      font-family: var(--font-serif);
      font-weight: 600;
    }
    .ui-num {
      font-size: 0.72rem;
      font-weight: 750;
      letter-spacing: 0.14em;
      color: var(--primary-ink, var(--primary));
    }
    .paleta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.75rem), 1fr));
      gap: 0.75rem;
    }
    .swatch-card {
      min-width: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      background: var(--card);
    }
    .swatch-cor {
      height: 44px;
      border-bottom: 1px solid var(--border);
    }
    .swatch-info {
      display: grid;
      gap: 0.18rem;
      padding: 0.7rem 0.8rem;
      font-size: 0.82rem;
    }
    .swatch-info strong {
      color: var(--foreground);
    }
    .swatch-info code {
      font-size: 0.78rem;
      color: var(--primary-ink, var(--primary-deep));
      font-weight: 700;
    }
    .swatch-info span {
      color: var(--muted-foreground);
      font-size: 0.76rem;
    }
    .ui-serif-amostra {
      margin: 0.45rem 0 0.85rem;
      font-family: var(--font-serif);
      font-size: 1.15rem;
      color: var(--foreground);
    }
    .ui-campos {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr));
      gap: 1rem;
      margin-bottom: 0.9rem;
    }
    .ui-tabs-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .ui-tab-panel {
      padding: 0.85rem 1rem;
      border: 1px dashed var(--border);
      border-radius: var(--radius-md);
      background: var(--background);
      color: var(--secondary-foreground);
    }
    .ui-showcase-feedback {
      margin: 0.9rem 0 0;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--accent-border, #b7d2be);
      background: var(--accent, #e8efe7);
      color: var(--accent-foreground, #30523b);
      font-size: 0.9rem;
      font-weight: 650;
      line-height: 1.45;
    }
    .bistro-details {
      margin-top: 0.9rem;
    }
    @media (max-width: 520px) {
      .ui-hero {
        padding: 1rem;
      }
      .ui-tabs-3 {
        grid-template-columns: 1fr;
      }
    }
    @media (max-width: 420px) {
      .ui-campos {
        gap: 0.8rem;
      }
    }
  `,
})
export class CatalogoUiComponent {
  readonly unidades = ['Centro', 'Jardins', 'Vila Nova'];
  readonly unidadeSelecionada = signal('Centro');
  readonly seletorAberto = signal(false);
  readonly acaoShowcase = signal('');

  readonly paleta: TokenPaleta[] = [
    { nome: 'Linho', hex: '#faf7f2', uso: 'Fundo principal' },
    { nome: 'Carvão', hex: '#292521', uso: 'Texto primário' },
    { nome: 'Taupe', hex: '#6e6259', uso: 'Texto secundário' },
    { nome: 'Terracota', hex: '#a53e2b', uso: 'Ação e foco' },
    { nome: 'Sálvia', hex: '#30523b', uso: 'Sucesso e pronto' },
    { nome: 'Creme', hex: '#f0ebe3', uso: 'Superfície de apoio' },
    { nome: 'Estado desabilitado', hex: '#efe9e0', uso: 'Texto #594e46 · 6.69:1' },
    { nome: 'Borda', hex: '#e5ded3', uso: 'Divisores e contornos' },
  ];

  alternarSeletor(): void {
    this.seletorAberto.update((atual) => !atual);
  }

  selecionarUnidade(unidade: string, selectEl?: HTMLSelectElement): void {
    this.unidadeSelecionada.set(unidade);
    if (selectEl) selectEl.value = unidade;
    this.seletorAberto.set(false);
  }

  fecharSeletorSeSaiu(evento: FocusEvent): void {
    const destino = evento.relatedTarget as Node | null;
    if (!(evento.currentTarget as HTMLElement).contains(destino)) {
      this.seletorAberto.set(false);
    }
  }

  aoMudarSelect(evento: Event): void {
    const select = evento.target as HTMLSelectElement;
    this.unidadeSelecionada.set(select.value);
    this.seletorAberto.set(false);
  }

  fecharDialogo(dialogo: HTMLDialogElement, gatilho: HTMLButtonElement): void {
    dialogo.close();
    gatilho.focus();
  }

  agendarRetornoFoco(gatilho: HTMLButtonElement): void {
    queueMicrotask(() => gatilho.focus());
  }
}
