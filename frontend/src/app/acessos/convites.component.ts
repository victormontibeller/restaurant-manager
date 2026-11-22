import { Component, ElementRef, OnInit, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';
import { ConvitePendenteService } from './convite-pendente.service';

interface Unidade {
  id: string;
  nome: string;
}

interface Convite {
  id: string;
  email: string;
  perfil: string;
  unidades: string[];
  estado: string;
  expiraEm: string;
}

@Component({
  selector: 'app-convites',
  imports: [HlmButton],
  template: `
    <section class="s6-stack" aria-labelledby="convites-titulo" [attr.aria-busy]="ocupado()">
      <div class="s6-grid-2">
        <div class="s6-talao">
          <div class="s6-sec-line">
            <span class="s6-sec-num">01 · REAUTENTICAÇÃO</span>
            <span class="s6-sec-dotted"></span>
            <span class="s6-badge s6-badge-warn">Validade 15 min</span>
          </div>
          <h2 id="convites-titulo" class="s6-title">Convites de funcionários</h2>
          <p class="s6-note">
            Somente contas novas. Não converte clientes nem reativa funcionários. O destinatário verifica o e-mail e define a própria senha. Validade: quinze minutos.
          </p>
          <p class="s6-note">
            Administrador cobre todas as unidades; demais perfis sem vínculos não acessam unidades.
          </p>
          <form class="s6-form-stack" (submit)="reautenticar($event, senha)">
            <div class="s6-field">
              <label for="senha-convite-admin">Confirme sua senha para convidar</label>
              <input
                #senha
                id="senha-convite-admin"
                type="password"
                autocomplete="current-password"
                required
                maxlength="72"
                [attr.aria-describedby]="senhaInvalida() ? 'erro-convites-admin' : null"
                [attr.aria-invalid]="senhaInvalida() ? true : null"
                [disabled]="ocupado()"
              />
            </div>
            <button hlmBtn class="s6-btn-full s6-push-bottom" [disabled]="ocupado()">
              Confirmar identidade para convites
            </button>
          </form>
        </div>

        @if (pendente(); as p) {
          <div class="s6-talao s6-talao-warn">
            <div class="s6-sec-line">
              <span class="s6-sec-num">02 · RECUPERAÇÃO IDEMPOTENTE</span>
              <span class="s6-sec-dotted"></span>
              <span class="s6-badge s6-badge-warn">Resultado pendente</span>
            </div>
            <p class="s6-amber" role="status">
              Convite com resultado pendente: {{ p.id }} · {{ p.email }}. Não crie outra intenção. Fechar ou recarregar esta página perde o rascunho; consulte este identificador ao retornar.
            </p>
            <div class="s6-grid-2 s6-push-bottom">
              <button
                hlmBtn
                class="s6-btn-full"
                type="button"
                (click)="enviar()"
                [disabled]="ocupado()"
              >
                Reenviar mesma intenção
              </button>
              <button
                hlmBtn
                variant="outline"
                class="s6-btn-full"
                type="button"
                (click)="consultar(p.id)"
                [disabled]="ocupado()"
              >
                Conferir intenção pendente
              </button>
            </div>
          </div>
        } @else {
          <form class="s6-card s6-form-stack" data-rascunho="convite" (submit)="criar($event, email.value)">
            <div class="s6-sec-line">
              <span class="s6-sec-num">02 · NOVO CONVITE</span>
              <span class="s6-sec-dotted"></span>
            </div>
            <div class="s6-field">
              <label for="email-convite">E-mail do funcionário convidado</label>
              <input
                #email
                id="email-convite"
                type="email"
                required
                maxlength="254"
                autocomplete="off"
                placeholder="colaborador@empresa.com"
                [disabled]="ocupado()"
              />
            </div>

            <div class="s6-field">
              <label for="perfil-convite">Perfil do convite</label>
              <div
                class="bistro-select-wrap"
                (focusout)="
                  !$any($event.currentTarget).contains($event.relatedTarget) &&
                    menuPerfilAberto.set(false)
                "
              >
                <div
                  class="bistro-select-pill"
                  [class.open]="menuPerfilAberto()"
                  [class.disabled]="ocupado()"
                  (mousedown)="!ocupado() && $event.preventDefault()"
                  (click)="
                    !ocupado() && seletorPerfilConvite.focus();
                    !ocupado() && menuPerfilAberto.set(!menuPerfilAberto())
                  "
                >
                  <svg
                    class="bistro-select-ico"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="1.9"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  <span class="bistro-select-val" aria-hidden="true">{{ perfil() }}</span>
                  <select
                    #seletorPerfilConvite
                    id="perfil-convite"
                    class="bistro-select-native"
                    [value]="perfil()"
                    (keydown.enter)="
                      $event.preventDefault();
                      !ocupado() && menuPerfilAberto.set(!menuPerfilAberto())
                    "
                    (keydown.space)="
                      $event.preventDefault();
                      !ocupado() && menuPerfilAberto.set(!menuPerfilAberto())
                    "
                    (keydown.escape)="menuPerfilAberto.set(false)"
                    (change)="
                      menuPerfilAberto.set(false);
                      perfil.set(seletorPerfilConvite.value);
                      vinculos.set([])
                    "
                    [disabled]="ocupado()"
                  >
                    @for (p of perfis; track p) {
                      <option [value]="p" [selected]="perfil() === p">{{ p }}</option>
                    }
                  </select>
                  <svg
                    class="bistro-select-chev"
                    [class.rot]="menuPerfilAberto()"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                @if (menuPerfilAberto() && !ocupado()) {
                  <div class="bistro-select-popover" role="presentation">
                    <p class="bistro-select-popover-title">Perfil do convite</p>
                    @for (p of perfis; track p) {
                      <button
                        type="button"
                        class="bistro-select-opt"
                        [class.on]="perfil() === p"
                        tabindex="-1"
                        (mousedown)="$event.preventDefault()"
                        (click)="selecionarPerfil(p, seletorPerfilConvite)"
                      >
                        <span class="bistro-select-opt-main">
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="1.9"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                            <circle cx="12" cy="7" r="4" />
                          </svg>
                          <span>{{ p }}</span>
                        </span>
                        @if (perfil() === p) {
                          <span class="bistro-select-opt-check" aria-hidden="true">
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.8"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                            >
                              <path d="m5 12.5 4.5 4.5L19 7.5" />
                            </svg>
                          </span>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            </div>

            @if (perfil() !== 'ADMINISTRADOR') {
              <fieldset class="s6-units-fieldset" [disabled]="ocupado()">
                <legend>Unidades do convite</legend>
                <div class="s6-units-grid">
                  @for (u of unidades(); track u.id) {
                    <label
                      class="s6-tactile-row s6-tactile-center"
                      [class.checked]="vinculos().includes(u.id)"
                    >
                      <input
                        type="checkbox"
                        [checked]="vinculos().includes(u.id)"
                        (change)="vincular(u.id, $any($event.target).checked)"
                      />
                      <span>{{ u.nome }}</span>
                    </label>
                  }
                </div>
              </fieldset>
            } @else {
              <p class="s6-callout">Administrador cobre todas as unidades automaticamente.</p>
            }

            <button hlmBtn class="s6-btn-full s6-push-bottom" [disabled]="ocupado() || !carregado()">
              Criar convite
            </button>
          </form>
        }
      </div>

      @if (erro()) {
        <p #alerta id="erro-convites-admin" role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p role="status" class="s6-callout">{{ aviso() }}</p>
      }

      <div class="s6-card">
        <div class="s6-sec-line">
          <span class="s6-sec-num">03 · CONSULTA POR ID E HISTÓRICO</span>
          <span class="s6-sec-dotted"></span>
          <button
            hlmBtn
            variant="outline"
            class="s6-btn-compact"
            type="button"
            (click)="carregar(pagina())"
            [disabled]="ocupado()"
          >
            Recarregar convites
          </button>
        </div>

        <form class="s6-reauth-row" (submit)="buscar($event, id.value)">
          <div class="s6-field">
            <label for="id-convite">Identificador do convite</label>
            <input
              #id
              id="id-convite"
              class="s6-mono-input"
              placeholder="Cole o UUID caso precise reconciliar um envio…"
              required
              [disabled]="ocupado()"
            />
          </div>
          <button hlmBtn variant="outline" [disabled]="ocupado()">Consultar convite</button>
        </form>

        @if (encontrado(); as c) {
          <p role="status" class="s6-callout">
            {{ c.id }} · {{ c.email }} · {{ c.perfil }} · {{ c.estado }}
          </p>
        }

        <div class="s6-filter-pills" role="group" aria-label="Filtrar convites por estado">
          <button
            type="button"
            class="s6-pill-btn"
            [class.active]="filtroEstado() === 'TODOS'"
            (click)="filtroEstado.set('TODOS')"
          >
            Todos ({{ lista().length }})
          </button>
          <button
            type="button"
            class="s6-pill-btn"
            [class.active]="filtroEstado() === 'PENDENTE'"
            (click)="filtroEstado.set('PENDENTE')"
          >
            Pendentes ({{ contagemEstado('PENDENTE') }})
          </button>
          <button
            type="button"
            class="s6-pill-btn"
            [class.active]="filtroEstado() === 'ACEITO'"
            (click)="filtroEstado.set('ACEITO')"
          >
            Aceitos ({{ contagemEstado('ACEITO') }})
          </button>
          <button
            type="button"
            class="s6-pill-btn"
            [class.active]="filtroEstado() === 'REVOGADO'"
            (click)="filtroEstado.set('REVOGADO')"
          >
            Revogados ({{ contagemEstado('REVOGADO') }})
          </button>
        </div>

        <div class="s6-cards-list">
          @for (c of convitesFiltrados(); track c.id) {
            <article class="s6-emp-card">
              <div class="s6-emp-head">
                <div class="s6-invite-main">
                  <h3 class="s6-invite-email">{{ c.email }}</h3>
                  <span class="s6-note">Expira em {{ formatarExpiracao(c.expiraEm) }}</span>
                </div>
                <div class="s6-badges-row">
                  <span class="s6-badge">{{ c.perfil }}</span>
                  <span
                    class="s6-badge"
                    [class.s6-badge-ok]="c.estado === 'ACEITO'"
                    [class.s6-badge-warn]="c.estado === 'PENDENTE'"
                    [class.s6-badge-danger]="c.estado === 'REVOGADO'"
                  >
                    {{ rotuloEstado(c.estado) }}<span class="sr-only"> {{ c.estado }}</span>
                  </span>
                </div>
              </div>
              <div class="s6-invite-footer">
                <span class="s6-uuid-chip">ID: {{ idCurto(c.id) }}</span>
                <div class="s6-invite-actions">
                  <button
                    hlmBtn
                    variant="outline"
                    class="s6-btn-compact"
                    type="button"
                    (click)="copiarId(c.id)"
                  >
                    @if (idCopiado() === c.id) {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.4"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                      <span>Copiado</span>
                    } @else {
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.9"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        aria-hidden="true"
                      >
                        <rect width="14" height="14" x="8" y="8" rx="2" />
                        <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                      </svg>
                      <span>Copiar ID</span>
                    }
                  </button>
                  @if (c.estado === 'PENDENTE') {
                    <button
                      hlmBtn
                      variant="outline"
                      class="btn-cancelar-outline s6-btn-compact"
                      type="button"
                      (click)="revogar(c.id)"
                      [disabled]="ocupado()"
                    >
                      Revogar convite<span class="sr-only"> de {{ c.email }}</span>
                    </button>
                  }
                </div>
              </div>
            </article>
          } @empty {
            <p class="bistro-empty">Nenhum convite nesta página.</p>
          }
        </div>

        <nav class="s6-pager" aria-label="Páginas de convites">
          <button
            hlmBtn
            variant="outline"
            type="button"
            (click)="carregar(pagina() - 1)"
            [disabled]="ocupado() || pagina() === 0"
          >
            Convites anteriores
          </button>
          <span>Página {{ pagina() + 1 }}</span>
          <button
            hlmBtn
            variant="outline"
            type="button"
            (click)="carregar(pagina() + 1)"
            [disabled]="ocupado() || lista().length < 50"
          >
            Próximos convites
          </button>
        </nav>
      </div>
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .s6-stack {
      display: grid;
      gap: 1rem;
      min-width: 0;
    }
    .s6-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      align-items: stretch;
    }
    .s6-talao {
      background: var(--card);
      border: 1px solid var(--border);
      border-top: 3px solid var(--primary);
      border-radius: var(--radius-lg, 1.05rem);
      padding: 1.15rem;
      box-shadow: var(--shadow-soft);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      min-width: 0;
    }
    .s6-talao-warn {
      border-top-color: var(--amber-fg);
    }
    .s6-card {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg, 1.05rem);
      padding: 1.15rem;
      box-shadow: var(--shadow-soft);
      display: grid;
      gap: 0.85rem;
      min-width: 0;
    }
    .s6-form-stack {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin: 0;
      flex: 1;
      min-width: 0;
    }
    .s6-push-bottom {
      margin-top: auto;
    }
    .s6-title {
      margin: 0;
      font-size: 1.12rem;
      font-weight: 750;
      color: var(--foreground);
    }
    .s6-sec-line {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      flex-wrap: wrap;
      min-width: 0;
    }
    .s6-sec-num {
      font-size: 0.7rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--primary-ink);
      overflow-wrap: anywhere;
    }
    .s6-sec-dotted {
      flex: 1;
      min-width: 16px;
      border-bottom: 1px dashed var(--border);
    }
    .s6-note {
      margin: 0;
      font-size: 0.85rem;
      color: var(--muted-foreground);
      line-height: 1.48;
      overflow-wrap: anywhere;
    }
    .s6-callout {
      margin: 0;
      padding: 0.8rem 0.95rem;
      border: 1px solid var(--border);
      border-left: 3px solid var(--primary);
      border-radius: 0.75rem;
      background: var(--background);
      font-size: 0.85rem;
      color: var(--foreground);
      line-height: 1.48;
      overflow-wrap: anywhere;
    }
    .s6-amber {
      margin: 0;
      padding: 0.85rem 0.95rem;
      border: 1px solid var(--amber-border);
      border-radius: 0.85rem;
      background: var(--amber-bg);
      color: var(--amber-fg);
      font-size: 0.85rem;
      line-height: 1.48;
      overflow-wrap: anywhere;
    }
    .s6-field {
      display: grid;
      gap: 0.35rem;
      min-width: 0;
    }
    .s6-field label {
      margin: 0;
      font-size: 0.8rem;
      font-weight: 750;
      color: var(--secondary-foreground);
    }
    .s6-mono-input {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.84rem;
    }
    .s6-reauth-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.65rem;
      align-items: end;
      margin: 0;
    }
    .s6-units-fieldset {
      border: 1px solid var(--border);
      border-radius: 0.85rem;
      padding: 0.75rem;
      margin: 0;
      background: var(--background);
      min-width: 0;
    }
    .s6-units-fieldset legend {
      padding: 0 0.35rem;
      font-size: 0.78rem;
      font-weight: 750;
      color: var(--secondary-foreground);
    }
    .s6-units-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .s6-tactile-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-height: 48px;
      padding: 0.65rem 0.8rem;
      border-radius: 0.8rem;
      border: 1px solid var(--border);
      background: var(--card);
      cursor: pointer;
      margin: 0;
      transition:
        background-color 0.14s ease,
        border-color 0.14s ease;
    }
    .s6-tactile-row.checked {
      background: var(--primary-soft);
      border-color: var(--primary-soft-border);
    }
    .s6-tactile-row input[type='checkbox'] {
      width: 22px;
      height: 22px;
      margin: 0;
      accent-color: var(--primary);
      flex: none;
      cursor: pointer;
    }
    .s6-tactile-row span {
      font-size: 0.86rem;
      font-weight: 650;
      color: var(--foreground);
      overflow-wrap: anywhere;
    }
    .s6-filter-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
    }
    .s6-pill-btn {
      min-height: 48px;
      padding: 0.45rem 0.9rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--background);
      color: var(--secondary-foreground);
      font-size: 0.8rem;
      font-weight: 700;
      box-shadow: none;
      cursor: pointer;
    }
    .s6-pill-btn:hover:not(:disabled) {
      background: var(--muted);
      filter: none;
    }
    .s6-pill-btn.active {
      background: var(--primary-soft);
      border-color: var(--primary-soft-border);
      color: var(--primary-ink);
    }
    .s6-cards-list {
      display: grid;
      gap: 0.75rem;
      min-width: 0;
    }
    .s6-emp-card {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 0.95rem;
      padding: 0.95rem;
      display: grid;
      gap: 0.75rem;
      min-width: 0;
    }
    .s6-emp-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.6rem;
      flex-wrap: wrap;
      min-width: 0;
    }
    .s6-invite-main {
      display: grid;
      gap: 0.2rem;
      min-width: 0;
      flex: 1 1 200px;
    }
    .s6-invite-email {
      margin: 0;
      font-size: 0.96rem;
      font-weight: 750;
      color: var(--foreground);
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .s6-badges-row {
      display: flex;
      gap: 0.35rem;
      flex-wrap: wrap;
    }
    .s6-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.28rem 0.68rem;
      border-radius: 999px;
      font-size: 0.74rem;
      font-weight: 750;
      border: 1px solid var(--border);
      background: var(--secondary);
      color: var(--secondary-foreground);
      white-space: nowrap;
    }
    .s6-badge-ok {
      background: var(--accent);
      border-color: var(--accent-border);
      color: var(--accent-foreground);
    }
    .s6-badge-warn {
      background: var(--amber-bg);
      border-color: var(--amber-border);
      color: var(--amber-fg);
    }
    .s6-badge-danger {
      background: var(--danger-bg);
      border-color: var(--danger-border);
      color: var(--danger-fg);
    }
    .s6-invite-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem;
      flex-wrap: wrap;
      border-top: 1px dashed var(--border);
      padding-top: 0.65rem;
    }
    .s6-uuid-chip {
      display: inline-flex;
      align-items: center;
      padding: 0.3rem 0.65rem;
      border-radius: 999px;
      background: var(--muted);
      border: 1px solid var(--border);
      color: var(--muted-foreground);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.74rem;
    }
    .s6-invite-actions {
      display: flex;
      gap: 0.45rem;
      flex-wrap: wrap;
    }
    .s6-pager {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.55rem;
      padding-top: 0.65rem;
      border-top: 1px dashed var(--border);
    }
    .s6-pager span {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--muted-foreground);
      font-variant-numeric: tabular-nums;
      text-align: center;
    }
    .s6-btn-full {
      width: 100%;
    }
    .s6-btn-compact {
      min-height: 48px;
      padding: 0.5rem 0.9rem;
      font-size: 0.8rem;
      border-radius: 999px;
    }
    .btn-cancelar-outline {
      color: var(--danger-fg);
      border-color: var(--danger-border);
      background: var(--card);
    }
    .btn-cancelar-outline:hover:not(:disabled) {
      background: var(--danger-bg);
      border-color: var(--danger-fg);
      filter: none;
    }
    button[hlmBtn]:not([data-variant='outline']):not([variant='outline']):not(
        [data-variant='ghost']
      ):not([variant='ghost']):not([data-variant='secondary']):not([variant='secondary']):not(
        :disabled
      ) {
      box-shadow: 0 3px 0 var(--primary-deep);
    }
    button[hlmBtn]:not(:disabled):active {
      transform: translateY(1px);
    }
    .bistro-select-pill.disabled {
      opacity: 0.72;
      background-color: var(--disabled-bg);
      border-color: var(--disabled-border);
      color: var(--disabled-fg);
      box-shadow: none;
      cursor: not-allowed;
    }
    @media (max-width: 860px) {
      .s6-grid-2 {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 600px) {
      .s6-talao,
      .s6-card {
        padding: 0.95rem;
      }
      .s6-sec-dotted {
        display: none;
      }
      .s6-reauth-row,
      .s6-units-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .s6-filter-pills {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .s6-invite-footer {
        flex-direction: column;
        align-items: stretch;
      }
      .s6-uuid-chip {
        align-self: flex-start;
      }
      .s6-invite-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        width: 100%;
      }
      .s6-invite-actions button {
        width: 100%;
        border-radius: 0.75rem;
      }
      .s6-pager {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
      }
      .s6-pager span {
        order: -1;
      }
      .bistro-select-popover {
        left: 0;
        right: 0;
        min-width: 0;
        max-width: calc(100vw - 32px);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      button[hlmBtn]:not(:disabled):active {
        transform: none;
      }
    }
  `,
})
export class ConvitesComponent implements OnInit {
  private readonly sessao = inject(SessaoService);
  readonly pendente = inject(ConvitePendenteService).daConta(this.sessao.identidade()!.usuarioId);
  readonly perfis = ['COZINHA', 'ATENDIMENTO', 'CAIXA', 'EXPEDICAO', 'GERENTE', 'ADMINISTRADOR'];
  readonly perfil = signal('COZINHA');
  readonly vinculos = signal<string[]>([]);
  readonly unidades = signal<Unidade[]>([]);
  readonly lista = signal<Convite[]>([]);
  readonly encontrado = signal<Convite | null>(null);
  readonly pagina = signal(0);
  readonly carregado = signal(false);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly filtroEstado = signal<'TODOS' | 'PENDENTE' | 'ACEITO' | 'REVOGADO'>('TODOS');
  readonly menuPerfilAberto = signal(false);
  readonly idCopiado = signal('');
  readonly bloqueio = output<boolean>();
  readonly salvo = output<string>();
  readonly senhaInvalida = signal(false);
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    void this.carregar(0);
  }

  vincular(id: string, ativo: boolean): void {
    this.vinculos.update((v) => (ativo ? [...new Set([...v, id])] : v.filter((x) => x !== id)));
  }

  selecionarPerfil(perfil: string, selectEl?: HTMLSelectElement): void {
    this.menuPerfilAberto.set(false);
    this.perfil.set(perfil);
    this.vinculos.set([]);
    if (selectEl) {
      selectEl.value = perfil;
      selectEl.focus();
    }
  }

  convitesFiltrados(): Convite[] {
    const filtro = this.filtroEstado();
    if (filtro === 'TODOS') return this.lista();
    return this.lista().filter((c) => c.estado === filtro);
  }

  contagemEstado(estado: 'PENDENTE' | 'ACEITO' | 'REVOGADO'): number {
    return this.lista().filter((c) => c.estado === estado).length;
  }

  idCurto(id: string): string {
    return id.length > 16 ? id.slice(0, 8) + '…' + id.slice(-4) : id;
  }

  formatarExpiracao(valor: string): string {
    if (!valor) return '—';
    const parsed = new Date(valor);
    if (Number.isNaN(parsed.getTime())) return valor;
    return parsed.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  rotuloEstado(estado: string): string {
    if (estado === 'PENDENTE') return 'Pendente';
    if (estado === 'ACEITO') return 'Aceito';
    if (estado === 'REVOGADO') return 'Revogado';
    if (estado === 'EXPIRADO') return 'Expirado';
    return estado;
  }

  copiarId(id: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(id);
    }
    this.idCopiado.set(id);
    setTimeout(() => {
      if (this.idCopiado() === id) this.idCopiado.set('');
    }, 2000);
  }

  async carregar(pagina: number): Promise<void> {
    await this.executar(async () => {
      const lista = await this.sessao.api<Convite[]>('/api/v1/equipe/convites?pagina=' + pagina);
      const unidades = await this.sessao.api<Unidade[]>('/api/v1/operacao/unidades');
      this.lista.set(lista);
      this.unidades.set(unidades);
      this.pagina.set(pagina);
      this.carregado.set(true);
    });
  }

  async reautenticar(event: Event, input: HTMLInputElement): Promise<void> {
    event.preventDefault();
    const senha = input.value;
    input.value = '';
    await this.executar(async () => {
      await this.sessao.api('/api/v1/auth/reautenticar', 'POST', { senha });
      this.aviso.set('Identidade confirmada por cinco minutos.');
    });
  }

  async criar(event: Event, email: string): Promise<void> {
    event.preventDefault();
    if (this.ocupado() || this.pendente()) return;
    this.pendente.set({
      id: crypto.randomUUID(),
      email,
      perfil: this.perfil(),
      unidades: [...this.vinculos()],
      incerta: false,
    });
    await this.enviar();
  }

  async enviar(): Promise<void> {
    await this.executar(async () => {
      const p = this.pendente();
      if (!p) return;
      try {
        const c = await this.sessao.api<Convite>('/api/v1/equipe/convites', 'POST', {
          id: p.id,
          email: p.email,
          perfil: p.perfil,
          unidades: p.unidades,
        });
        this.encontrado.set(c);
        this.pendente.set(null);
        this.salvo.emit('convite');
        this.aviso.set(
          'Convite registrado no servidor: ' +
            c.id +
            ' · ' +
            c.estado +
            '. Confira a captura privada.',
        );
      } catch (error) {
        if (error instanceof ApiFailure && error.status < 500 && !p.incerta)
          this.pendente.set(null);
        else {
          this.pendente.set({ ...p, incerta: true });
          throw new Error(
            'Resultado incerto. Confira o identificador ou reenvie a mesma intenção; não crie outro convite.',
          );
        }
        throw error;
      }
    });
  }

  async buscar(event: Event, id: string): Promise<void> {
    event.preventDefault();
    await this.consultar(id);
  }

  async consultar(id: string): Promise<void> {
    await this.executar(async () => {
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
        throw new Error('Informe um identificador UUID válido.');
      const c = await this.sessao.api<Convite>('/api/v1/equipe/convites/' + id);
      this.encontrado.set(c);
      if (this.pendente()?.id === c.id) {
        this.pendente.set(null);
        this.salvo.emit('convite');
      }
      this.aviso.set('Resultado consultado no servidor.');
    });
  }

  async revogar(id: string): Promise<void> {
    await this.executar(async () => {
      const c = await this.sessao.api<Convite>(
        '/api/v1/equipe/convites/' + id + '/revogar',
        'POST',
        {},
      );
      this.lista.update((v) => v.map((x) => (x.id === id ? c : x)));
      this.aviso.set(
        'Revogação confirmada. Mensagens já capturadas podem permanecer, mas o código não autoriza aceite.',
      );
    });
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.bloqueio.emit(true);
    this.erro.set('');
    this.aviso.set('');
    this.senhaInvalida.set(false);
    try {
      await acao();
    } catch (error) {
      this.senhaInvalida.set(
        error instanceof ApiFailure &&
          error.status === 422 &&
          error.codigo === 'CONFIRMACAO_INVALIDA',
      );
      this.erro.set(
        error instanceof Error
          ? error.message
          : 'Resultado não confirmado. Consulte o identificador.',
      );
      setTimeout(() => this.alerta?.nativeElement.focus());
    } finally {
      this.ocupado.set(false);
      this.bloqueio.emit(!!this.pendente());
    }
  }
}
