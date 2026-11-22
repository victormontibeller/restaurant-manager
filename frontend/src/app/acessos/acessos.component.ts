import { Component, ElementRef, OnInit, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';

interface Acao {
  codigo: string;
  descricao: string;
  escopo: string;
  dependencia: string | null;
}

interface Matriz {
  versao: number;
  acoes: Acao[];
  perfis: Record<string, string[]>;
}

interface Unidade {
  id: string;
  nome: string;
}

interface Funcionario {
  id: string;
  email: string;
  perfil: string;
  ativo: boolean;
  versao: number;
  unidades: string[];
}

@Component({
  selector: 'app-acessos',
  imports: [HlmButton],
  template: `
    <section class="s6-stack" aria-labelledby="acessos-titulo" [attr.aria-busy]="ocupado()">
      <div class="s6-talao">
        <div class="s6-head">
          <div class="s6-title-wrap">
            <p class="eyebrow">01 · GOVERNANÇA E REAUTENTICAÇÃO</p>
            <h2 id="acessos-titulo">Configurações de acessos</h2>
          </div>
          <div class="s6-head-actions">
            <span class="s6-badge s6-badge-ok">Admin protegido · todas as unidades</span>
            <button
              hlmBtn
              variant="outline"
              type="button"
              (click)="carregar()"
              [disabled]="ocupado()"
            >
              Recarregar acessos
            </button>
          </div>
        </div>
        <p class="s6-note">
          Administrador é protegido e cobre todas as unidades. Alterações valem na próxima operação, sem novo login.
        </p>
        <p class="s6-note">
          As permissões controlam as operações conforme o perfil e a unidade, incluindo pedidos, pagamentos e delivery.
        </p>
        <form class="s6-reauth-row" (submit)="confirmar($event, senha)">
          <div class="s6-field">
            <label for="confirmar-senha">Confirme sua senha</label>
            <input
              #senha
              id="confirmar-senha"
              type="password"
              autocomplete="current-password"
              required
              maxlength="72"
              [attr.aria-describedby]="senhaInvalida() ? 'erro-acessos' : null"
              [attr.aria-invalid]="senhaInvalida() ? true : null"
              [disabled]="ocupado()"
            />
          </div>
          <button hlmBtn [disabled]="ocupado()">Confirmar identidade</button>
        </form>
        @if (erro()) {
          <p #alerta id="erro-acessos" role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
        }
        @if (aviso()) {
          <p aria-live="polite" class="s6-callout">{{ aviso() }}</p>
        }
      </div>

      @if (matriz(); as m) {
        <div class="s6-grid-equipe">
          <div class="s6-card">
            <div class="s6-sec-line">
              <span class="s6-sec-num">02 · MATRIZ POR PERFIL</span>
              <span class="s6-sec-dotted"></span>
              <span class="s6-badge s6-badge-terra">
                {{ escolhidas().size }} de {{ totalAcoesMatriz() }} ativas
              </span>
            </div>

            <div class="s6-grid-2">
              <div class="s6-field">
                <label for="perfil-acesso">Perfil operacional</label>
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
                      !ocupado() && seletorPerfilOp.focus();
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
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                    <span class="bistro-select-val" aria-hidden="true">{{ perfil() }}</span>
                    <select
                      #seletorPerfilOp
                      id="perfil-acesso"
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
                      (change)="menuPerfilAberto.set(false); selecionar(seletorPerfilOp.value)"
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
                      <p class="bistro-select-popover-title">Perfil operacional</p>
                      @for (p of perfis; track p) {
                        <button
                          type="button"
                          class="bistro-select-opt"
                          [class.on]="perfil() === p"
                          tabindex="-1"
                          (mousedown)="$event.preventDefault()"
                          (click)="selecionarPerfilOperacional(p, seletorPerfilOp)"
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
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

              <div class="s6-field">
                <label for="buscar-acao">Buscar ação</label>
                <input
                  id="buscar-acao"
                  type="search"
                  placeholder="Filtrar permissão…"
                  (input)="busca.set($any($event.target).value)"
                />
              </div>
            </div>

            <fieldset class="s6-matriz-fieldset" data-rascunho="matriz" [disabled]="ocupado()">
              <legend>Permissões de {{ perfil() }} · versão {{ m.versao }}</legend>
              <div class="s6-actions-list">
                @for (a of acoesFiltradas(); track a.codigo) {
                  <div class="s6-tactile-row" [class.checked]="escolhidas().has(a.codigo)">
                    <input
                      [id]="'acao-' + a.codigo"
                      type="checkbox"
                      [checked]="escolhidas().has(a.codigo)"
                      [disabled]="dependenciaObrigatoria(a.codigo)"
                      (change)="marcar(a, $any($event.target).checked)"
                    />
                    <div class="s6-tactile-meta">
                      <label [for]="'acao-' + a.codigo">{{ a.descricao }}</label>
                      <small>
                        {{
                          a.escopo === 'EMPRESA'
                            ? 'Afeta toda a empresa'
                            : 'Restrita às unidades atribuídas'
                        }}
                        @if (a.dependencia) {
                          · Inclui consulta mínima: {{ a.dependencia }}
                        }
                      </small>
                    </div>
                  </div>
                }
              </div>
            </fieldset>

            <button
              hlmBtn
              class="s6-btn-full"
              type="button"
              (click)="salvarMatriz()"
              [disabled]="ocupado()"
            >
              Salvar permissões
            </button>
          </div>

          <div class="s6-card">
            <div class="s6-sec-line">
              <span class="s6-sec-num">03 · FUNCIONÁRIOS EXISTENTES</span>
              <span class="s6-sec-dotted"></span>
              <a
                hlmBtn
                variant="outline"
                class="s6-btn-compact"
                href="/gestao/equipe/convites"
              >
                Gerenciar convites
              </a>
            </div>
            <h3 class="s6-subhead">Funcionários existentes</h3>
            <p class="s6-note">
              Para cadastrar um funcionário novo, use Gerenciar convites. Clientes não aparecem nesta lista.
            </p>
            <div class="s6-field">
              <label for="buscar-emp">Filtro rápido na página (opcional)</label>
              <input
                id="buscar-emp"
                type="search"
                placeholder="Buscar por e-mail ou cargo…"
                [value]="buscaFuncionario()"
                (input)="buscaFuncionario.set($any($event.target).value)"
              />
            </div>

            <div class="s6-cards-list">
              @for (f of funcionariosFiltrados(); track f.id) {
                <article class="s6-emp-card" [attr.data-rascunho]="'funcionario-' + f.id">
                  <div class="s6-emp-head">
                    <div class="s6-emp-id">
                      <div class="s6-avatar-mono" aria-hidden="true">{{ iniciaisEmail(f.email) }}</div>
                      <div class="s6-emp-meta">
                        <h4 class="s6-emp-email">{{ f.email }}</h4>
                        @if (f.perfil !== 'ADMINISTRADOR') {
                          <p class="s6-note">
                            Vínculos nesta edição: {{ f.unidades.length }}. Alterações só valem após salvar o funcionário.
                          </p>
                        } @else {
                          <p class="s6-note">Cobertura integral da empresa.</p>
                        }
                      </div>
                    </div>
                    <span
                      class="s6-badge"
                      [class.s6-badge-ok]="f.ativo"
                      [class.s6-badge-danger]="!f.ativo"
                    >
                      {{ f.ativo ? 'Ativo' : 'Inativo' }}
                    </span>
                  </div>

                  <div class="s6-emp-controls">
                    <div class="s6-field">
                      <label [for]="'perfil-' + f.id">Perfil do funcionário</label>
                      <div
                        class="bistro-select-wrap"
                        (focusout)="
                          !$any($event.currentTarget).contains($event.relatedTarget) &&
                            menuFuncionarioAberto() === f.id &&
                            menuFuncionarioAberto.set(null)
                        "
                      >
                        <div
                          class="bistro-select-pill"
                          [class.open]="menuFuncionarioAberto() === f.id"
                          [class.disabled]="ocupado()"
                          (mousedown)="!ocupado() && $event.preventDefault()"
                          (click)="
                            !ocupado() && seletorPerfilFunc.focus();
                            !ocupado() &&
                              menuFuncionarioAberto.set(
                                menuFuncionarioAberto() === f.id ? null : f.id
                              )
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
                          <span class="bistro-select-val" aria-hidden="true">{{ f.perfil }}</span>
                          <select
                            #seletorPerfilFunc
                            [id]="'perfil-' + f.id"
                            class="bistro-select-native"
                            [value]="f.perfil"
                            (keydown.enter)="
                              $event.preventDefault();
                              !ocupado() &&
                                menuFuncionarioAberto.set(
                                  menuFuncionarioAberto() === f.id ? null : f.id
                                )
                            "
                            (keydown.space)="
                              $event.preventDefault();
                              !ocupado() &&
                                menuFuncionarioAberto.set(
                                  menuFuncionarioAberto() === f.id ? null : f.id
                                )
                            "
                            (keydown.escape)="menuFuncionarioAberto.set(null)"
                            (change)="
                              menuFuncionarioAberto.set(null);
                              mudarPerfil(f, seletorPerfilFunc.value)
                            "
                            [disabled]="ocupado()"
                          >
                            <option value="ADMINISTRADOR" [selected]="f.perfil === 'ADMINISTRADOR'">
                              ADMINISTRADOR
                            </option>
                            @for (p of perfis; track p) {
                              <option [value]="p" [selected]="f.perfil === p">{{ p }}</option>
                            }
                          </select>
                          <svg
                            class="bistro-select-chev"
                            [class.rot]="menuFuncionarioAberto() === f.id"
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
                        @if (menuFuncionarioAberto() === f.id && !ocupado()) {
                          <div class="bistro-select-popover" role="presentation">
                            <p class="bistro-select-popover-title">Perfil do funcionário</p>
                            @for (p of ['ADMINISTRADOR', ...perfis]; track p) {
                              <button
                                type="button"
                                class="bistro-select-opt"
                                [class.on]="f.perfil === p"
                                tabindex="-1"
                                (mousedown)="$event.preventDefault()"
                                (click)="selecionarPerfilFuncionario(f, p, seletorPerfilFunc)"
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
                                @if (f.perfil === p) {
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

                    <label class="s6-tactile-row s6-tactile-center" [class.checked]="f.ativo">
                      <input
                        type="checkbox"
                        [checked]="f.ativo"
                        (change)="f.ativo = $any($event.target).checked"
                        [disabled]="ocupado()"
                      />
                      <span>Ativo</span>
                    </label>
                  </div>

                  <div class="s6-emp-actions-stack">
                    @if (f.perfil !== 'ADMINISTRADOR') {
                      <button
                        hlmBtn
                        variant="outline"
                        class="s6-btn-full"
                        type="button"
                        (click)="alternarUnidades(f.id)"
                        [disabled]="ocupado()"
                        [attr.aria-expanded]="funcionarioExpandido() === f.id"
                        [attr.aria-controls]="'unidades-' + f.id"
                      >
                        Editar unidades atribuídas
                      </button>
                      <div [id]="'unidades-' + f.id">
                        @if (funcionarioExpandido() === f.id) {
                          <fieldset class="s6-units-drawer" [disabled]="ocupado()">
                            <legend>Unidades atribuídas</legend>
                            <div class="s6-units-grid">
                              @for (u of unidades(); track u.id) {
                                <label
                                  class="s6-tactile-row s6-tactile-center"
                                  [class.checked]="f.unidades.includes(u.id)"
                                >
                                  <input
                                    type="checkbox"
                                    [checked]="f.unidades.includes(u.id)"
                                    (change)="vincular(f, u.id, $any($event.target).checked)"
                                  />
                                  <span>{{ u.nome }}</span>
                                </label>
                              }
                              @for (id of unidadesInativas(f); track id) {
                                <label class="s6-tactile-row s6-warn-row">
                                  <input
                                    type="checkbox"
                                    [checked]="f.unidades.includes(id)"
                                    (change)="vincular(f, id, $any($event.target).checked)"
                                  />
                                  <span>
                                    Vínculo em unidade inativa · <span class="s6-mono">{{ id }}</span>
                                  </span>
                                </label>
                              }
                            </div>
                            @if (unidadesInativas(f).length) {
                              <p class="s6-note">
                                Unidades inativas não concedem acesso. Desmarque para remover o vínculo ao salvar; mantê-lo permite acesso quando a unidade for reativada.
                              </p>
                            }
                          </fieldset>
                        }
                      </div>
                    }
                    <button
                      hlmBtn
                      class="s6-btn-full"
                      type="button"
                      (click)="salvarFuncionario(f)"
                      [disabled]="ocupado()"
                    >
                      Salvar funcionário
                    </button>
                  </div>
                </article>
              } @empty {
                <p class="bistro-empty">Nenhum funcionário nesta página.</p>
              }
            </div>

            <nav class="s6-pager" aria-label="Páginas de funcionários">
              <button
                hlmBtn
                variant="outline"
                type="button"
                (click)="paginaAnterior()"
                [disabled]="ocupado() || pagina() === 0"
              >
                Página anterior
              </button>
              <span>Página {{ pagina() + 1 }}</span>
              <button
                hlmBtn
                variant="outline"
                type="button"
                (click)="proximaPagina()"
                [disabled]="ocupado() || equipe().length < 50"
              >
                Próxima página
              </button>
            </nav>
          </div>
        </div>
      }
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
    .s6-talao {
      background: var(--card);
      border: 1px solid var(--border);
      border-top: 3px solid var(--primary);
      border-radius: var(--radius-lg, 1.05rem);
      padding: 1.15rem;
      box-shadow: var(--shadow-soft);
      display: grid;
      gap: 0.75rem;
      min-width: 0;
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
    .s6-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.6rem 0.9rem;
      min-width: 0;
    }
    .s6-title-wrap {
      display: grid;
      gap: 0.2rem;
      min-width: 0;
    }
    .s6-title-wrap .eyebrow {
      margin: 0;
    }
    .s6-head h2,
    .s6-subhead {
      margin: 0;
      font-size: 1.12rem;
      font-weight: 750;
      color: var(--foreground);
    }
    .s6-head-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
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
    .s6-badge-danger {
      background: var(--danger-bg);
      border-color: var(--danger-border);
      color: var(--danger-fg);
    }
    .s6-badge-terra {
      background: var(--primary-soft);
      border-color: var(--primary-soft-border);
      color: var(--primary-ink);
    }
    .s6-reauth-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.65rem;
      align-items: end;
      margin: 0.15rem 0 0;
    }
    .s6-grid-equipe {
      display: grid;
      grid-template-columns: minmax(0, 0.94fr) minmax(0, 1.06fr);
      gap: 1rem;
      align-items: start;
    }
    .s6-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
      align-items: end;
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
    .s6-matriz-fieldset {
      border: 1px solid var(--border);
      border-radius: 0.9rem;
      padding: 0.85rem;
      margin: 0;
      background: var(--card);
      min-width: 0;
    }
    .s6-matriz-fieldset legend {
      padding: 0 0.4rem;
      font-size: 0.8rem;
      font-weight: 750;
      color: var(--secondary-foreground);
    }
    .s6-actions-list,
    .s6-cards-list {
      display: grid;
      gap: 0.65rem;
      min-width: 0;
    }
    .s6-tactile-row {
      display: flex;
      align-items: flex-start;
      gap: 0.65rem;
      min-height: 48px;
      padding: 0.7rem 0.85rem;
      border-radius: 0.8rem;
      border: 1px solid var(--border);
      background: var(--background);
      cursor: pointer;
      transition:
        background-color 0.14s ease,
        border-color 0.14s ease;
    }
    .s6-tactile-row.s6-tactile-center {
      align-items: center;
      margin: 0;
    }
    .s6-tactile-row.checked {
      background: var(--primary-soft);
      border-color: var(--primary-soft-border);
    }
    .s6-tactile-row.s6-warn-row {
      background: var(--amber-bg);
      border-color: var(--amber-border);
      color: var(--amber-fg);
    }
    .s6-tactile-row input[type='checkbox'] {
      width: 22px;
      height: 22px;
      margin: 0;
      accent-color: var(--primary);
      flex: none;
      cursor: pointer;
    }
    .s6-tactile-meta {
      display: grid;
      gap: 0.18rem;
      min-width: 0;
      flex: 1;
    }
    .s6-tactile-meta label {
      margin: 0;
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--foreground);
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    .s6-tactile-meta small {
      font-size: 0.75rem;
      color: var(--muted-foreground);
      overflow-wrap: anywhere;
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
    .s6-emp-id {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-width: 0;
      flex: 1 1 200px;
    }
    .s6-emp-meta {
      display: grid;
      gap: 0.18rem;
      min-width: 0;
    }
    .s6-avatar-mono {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--primary-soft);
      border: 1px solid var(--primary-soft-border);
      color: var(--primary-ink);
      display: grid;
      place-items: center;
      font-family: var(--font-serif);
      font-weight: 700;
      flex: none;
    }
    .s6-emp-email {
      margin: 0;
      font-size: 0.92rem;
      font-weight: 750;
      color: var(--foreground);
      word-break: break-word;
      overflow-wrap: anywhere;
    }
    .s6-emp-controls {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 0.65rem;
      align-items: end;
    }
    .s6-emp-actions-stack {
      display: grid;
      gap: 0.65rem;
      width: 100%;
    }
    .s6-units-drawer {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 0.85rem;
      padding: 0.8rem;
      margin: 0;
      display: grid;
      gap: 0.55rem;
      min-width: 0;
    }
    .s6-units-drawer legend {
      padding: 0 0.35rem;
      font-size: 0.74rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--muted-foreground);
    }
    .s6-units-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.45rem;
    }
    .s6-mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.76rem;
      overflow-wrap: anywhere;
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
    @media (max-width: 980px) {
      .s6-grid-equipe {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 640px) {
      .s6-talao,
      .s6-card {
        padding: 0.95rem;
      }
      .s6-head-actions {
        width: 100%;
      }
      .s6-head-actions button,
      .s6-head-actions a {
        width: 100%;
      }
      .s6-sec-dotted {
        display: none;
      }
      .s6-reauth-row,
      .s6-grid-2,
      .s6-emp-controls,
      .s6-units-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .s6-emp-head {
        flex-direction: column;
        align-items: flex-start;
      }
      .s6-emp-email {
        font-size: 0.84rem;
        line-height: 1.32;
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
export class AcessosComponent implements OnInit {
  private readonly sessao = inject(SessaoService);
  readonly perfis = ['GERENTE', 'ATENDIMENTO', 'CAIXA', 'COZINHA', 'EXPEDICAO'];
  readonly matriz = signal<Matriz | null>(null);
  readonly equipe = signal<Funcionario[]>([]);
  readonly vinculosOriginais = signal<Record<string, string[]>>({});
  readonly unidades = signal<Unidade[]>([]);
  readonly perfil = signal('GERENTE');
  readonly escolhidas = signal(new Set<string>());
  readonly busca = signal('');
  readonly buscaFuncionario = signal('');
  readonly menuPerfilAberto = signal(false);
  readonly menuFuncionarioAberto = signal<string | null>(null);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly senhaInvalida = signal(false);
  readonly aviso = signal('');
  readonly pagina = signal(0);
  readonly funcionarioExpandido = signal<string | null>(null);
  readonly bloqueio = output<boolean>();
  readonly salvo = output<string>();
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(pagina = this.pagina()): Promise<void> {
    await this.executar(async () => {
      const m = await this.sessao.api<Matriz>('/api/v1/configuracoes/acessos');
      const e = await this.sessao.api<Funcionario[]>('/api/v1/equipe?pagina=' + pagina);
      const u = await this.sessao.api<Unidade[]>('/api/v1/operacao/unidades');
      this.matriz.set(m);
      this.equipe.set(e);
      this.vinculosOriginais.set(Object.fromEntries(e.map((f) => [f.id, [...f.unidades]])));
      this.unidades.set(u);
      this.pagina.set(pagina);
      this.funcionarioExpandido.set(null);
      this.selecionar(this.perfil());
    });
  }

  selecionar(perfil: string): void {
    this.perfil.set(perfil);
    this.escolhidas.set(new Set(this.matriz()?.perfis[perfil] ?? []));
  }

  acoesFiltradas(): Acao[] {
    const busca = this.busca().toLocaleLowerCase('pt-BR');
    return (
      this.matriz()?.acoes.filter((a) =>
        (a.descricao + ' ' + a.codigo).toLocaleLowerCase('pt-BR').includes(busca),
      ) ?? []
    );
  }

  dependenciaObrigatoria(codigo: string): boolean {
    return (
      this.matriz()?.acoes.some(
        (a) => a.dependencia === codigo && this.escolhidas().has(a.codigo),
      ) ?? false
    );
  }

  marcar(acao: Acao, marcado: boolean): void {
    const a = new Set(this.escolhidas());
    if (marcado) {
      a.add(acao.codigo);
      if (acao.dependencia) a.add(acao.dependencia);
    } else a.delete(acao.codigo);
    this.escolhidas.set(a);
  }

  async confirmar(event: Event, input: HTMLInputElement): Promise<void> {
    event.preventDefault();
    const senha = input.value;
    input.value = '';
    await this.executar(async () => {
      await this.sessao.api('/api/v1/auth/reautenticar', 'POST', { senha });
      this.aviso.set('Identidade confirmada por cinco minutos.');
    });
  }

  async salvarMatriz(): Promise<void> {
    await this.executar(async () => {
      const m = await this.sessao.api<Matriz>('/api/v1/configuracoes/acessos', 'PUT', {
        versao: this.matriz()?.versao,
        perfil: this.perfil(),
        acoes: [...this.escolhidas()],
      });
      this.matriz.set(m);
      this.selecionar(this.perfil());
      this.aviso.set('Permissões salvas no servidor.');
      this.salvo.emit('matriz');
    });
  }

  mudarPerfil(f: Funcionario, perfil: string): void {
    f.perfil = perfil;
    if (perfil === 'ADMINISTRADOR') {
      f.unidades = [];
      if (this.funcionarioExpandido() === f.id) this.funcionarioExpandido.set(null);
    }
  }

  funcionariosFiltrados(): Funcionario[] {
    const termo = this.buscaFuncionario().trim().toLocaleLowerCase('pt-BR');
    if (!termo) return this.equipe();
    return this.equipe().filter((f) =>
      (f.email + ' ' + f.perfil).toLocaleLowerCase('pt-BR').includes(termo),
    );
  }

  selecionarPerfilOperacional(perfil: string, selectEl?: HTMLSelectElement): void {
    this.menuPerfilAberto.set(false);
    if (selectEl) {
      selectEl.value = perfil;
      selectEl.focus();
    }
    this.selecionar(perfil);
  }

  selecionarPerfilFuncionario(f: Funcionario, perfil: string, selectEl?: HTMLSelectElement): void {
    this.menuFuncionarioAberto.set(null);
    this.mudarPerfil(f, perfil);
    if (selectEl) {
      selectEl.value = perfil;
      selectEl.focus();
    }
  }

  iniciaisEmail(email: string): string {
    return (email.trim().charAt(0) || 'E').toUpperCase();
  }

  totalAcoesMatriz(): number {
    return this.matriz()?.acoes.length ?? 0;
  }

  alternarUnidades(id: string): void {
    if (!this.ocupado()) this.funcionarioExpandido.update((atual) => (atual === id ? null : id));
  }

  unidadesInativas(f: Funcionario): string[] {
    return (this.vinculosOriginais()[f.id] ?? []).filter(
      (id) => !this.unidades().some((u) => u.id === id),
    );
  }

  vincular(f: Funcionario, id: string, marcado: boolean): void {
    f.unidades = marcado ? [...new Set([...f.unidades, id])] : f.unidades.filter((u) => u !== id);
  }

  async salvarFuncionario(f: Funcionario): Promise<void> {
    await this.executar(async () => {
      const result = await this.sessao.api<Funcionario>('/api/v1/equipe/' + f.id, 'PUT', {
        versao: f.versao,
        perfil: f.perfil,
        ativo: f.ativo,
        unidades: f.unidades,
      });
      this.equipe.update((rows) => rows.map((row) => (row.id === result.id ? result : row)));
      this.vinculosOriginais.update((rows) => ({ ...rows, [result.id]: [...result.unidades] }));
      this.aviso.set('Funcionário atualizado no servidor.');
      this.salvo.emit('funcionario-' + result.id);
      await this.sessao.atualizarIdentidade();
    });
  }

  paginaAnterior(): void {
    void this.carregar(Math.max(0, this.pagina() - 1));
  }

  proximaPagina(): void {
    void this.carregar(this.pagina() + 1);
  }

  private async executar(action: () => Promise<void>): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.bloqueio.emit(true);
    this.erro.set('');
    this.aviso.set('');
    this.senhaInvalida.set(false);
    try {
      await action();
    } catch (error) {
      this.senhaInvalida.set(
        error instanceof ApiFailure &&
          error.status === 422 &&
          error.codigo === 'CONFIRMACAO_INVALIDA',
      );
      this.erro.set(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir. Recarregue para conferir o resultado.',
      );
      setTimeout(() => this.alerta?.nativeElement.focus());
    } finally {
      this.ocupado.set(false);
      this.bloqueio.emit(false);
    }
  }
}
