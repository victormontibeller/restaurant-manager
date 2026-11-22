import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';

type Canal = 'DELIVERY' | 'RETIRADA' | 'MESA';

interface Horario {
  canal: Canal;
  diaSemana: number;
  inicio: string;
  fim: string;
}

interface LinhaHorario extends Horario {
  chave: number;
}

interface Funcionamento {
  unidadeId: string;
  versao: number;
  versaoUnidade: number;
  fuso: string;
  canais: Canal[];
  horarios: Horario[];
}

@Component({
  selector: 'app-funcionamento-unidade',
  imports: [HlmButton],
  template: `
    <section
      class="s6-func-section"
      [attr.data-rascunho]="'funcionamento-' + unidadeId"
      [attr.aria-labelledby]="'funcionamento-titulo-' + unidadeId"
      [attr.aria-busy]="ocupado()"
    >
      <div class="s6-head">
        <div class="s6-func-heading">
          <h5 [id]="'funcionamento-titulo-' + unidadeId">Horários e canais de {{ nome }}</h5>
          @if (aberto() && versao() !== null) {
            <p class="s6-note">
              Horários no fuso {{ fusoConsultado() }}. As alterações só passam a valer após a confirmação do servidor.
            </p>
          }
        </div>
        <div class="s6-head-actions">
          <button
            hlmBtn
            variant="outline"
            type="button"
            (click)="consultar()"
            [disabled]="bloqueado || ocupado()"
            [attr.aria-expanded]="aberto()"
            [attr.aria-controls]="'funcionamento-editor-' + unidadeId"
          >
            {{ aberto() ? 'Consultar funcionamento no servidor' : 'Configurar horários e canais' }}
          </button>
        </div>
      </div>

      @if (aberto()) {
        <div class="s6-func-editor" [id]="'funcionamento-editor-' + unidadeId">
          <p [id]="'funcionamento-ajuda-' + unidadeId" class="s6-note">
            O dia indica o início do atendimento. Um fim anterior ao início termina no dia seguinte; use 24:00 para meia-noite ao final do dia. Início e fim iguais não são aceitos. Intervalos não podem se sobrepor no mesmo canal.
          </p>
          @if (erro()) {
            <p #alerta role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
          }
          @if (aviso()) {
            <p role="status" class="s6-callout">{{ aviso() }}</p>
          }
          @if (reconsultaObrigatoria()) {
            <p class="s6-amber">
              Consulte o funcionamento no servidor para conferir o resultado e a versão atual antes de editar ou salvar novamente. A consulta substitui o rascunho exibido.
            </p>
          }

          @if (versao() !== null) {
            <div class="s6-func-meta-row">
              <p class="s6-badge">Versão do funcionamento: {{ versao() }}.</p>
            </div>

            <div class="s6-week-strip" aria-label="Resumo semanal">
              @for (diaResumo of diasSemanaResumo; track diaResumo.valor) {
                <div class="s6-day-pill" [class.on]="diaTemHorario(diaResumo.valor)">
                  <strong>{{ diaResumo.sigla }}</strong>
                  <span class="s6-day-text">
                    {{ diaTemHorario(diaResumo.valor) ? 'Com turno' : 'Fechado' }}
                  </span>
                  <span class="s6-day-ico" aria-hidden="true">
                    @if (diaTemHorario(diaResumo.valor)) {
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <path d="m5 12.5 4.5 4.5L19 7.5" />
                      </svg>
                    } @else {
                      —
                    }
                  </span>
                </div>
              }
            </div>

            <form class="s6-func-form" (submit)="salvar($event)">
              <fieldset
                class="s6-fieldset"
                [disabled]="bloqueado || ocupado() || reconsultaObrigatoria()"
              >
                <legend>Canais habilitados</legend>
                <div class="s6-channels-grid">
                  @for (canal of opcoesCanais; track canal.valor) {
                    <label
                      class="s6-tactile-row"
                      [class.checked]="canais().includes(canal.valor)"
                    >
                      <input
                        #habilitado
                        type="checkbox"
                        [checked]="canais().includes(canal.valor)"
                        (change)="habilitar(canal.valor, habilitado.checked)"
                      />
                      <span>{{ canal.rotulo }}</span>
                    </label>
                  }
                </div>
              </fieldset>

              <p class="s6-note">
                Sem horário cadastrado, o canal fica fechado. Desabilitar um canal preserva seus horários para uma futura reativação.
              </p>

              @for (horario of horarios(); track horario.chave; let indice = $index) {
                <fieldset
                  class="horario s6-schedule-fieldset"
                  [disabled]="bloqueado || ocupado() || reconsultaObrigatoria()"
                  [attr.aria-describedby]="'funcionamento-ajuda-' + unidadeId"
                >
                  <legend>Horário {{ indice + 1 }}</legend>

                  <div class="s6-schedule-grid">
                    <div class="s6-field s6-schedule-wide">
                      <label [for]="campo(horario.chave, 'canal')">Canal</label>
                      <div
                        class="bistro-select-wrap"
                        (focusout)="
                          !$any($event.currentTarget).contains($event.relatedTarget) &&
                            menuAberto() === 'canal-' + horario.chave &&
                            menuAberto.set(null)
                        "
                      >
                        <div
                          class="bistro-select-pill"
                          [class.open]="menuAberto() === 'canal-' + horario.chave"
                          [class.disabled]="bloqueado || ocupado() || reconsultaObrigatoria()"
                          (mousedown)="
                            !(bloqueado || ocupado() || reconsultaObrigatoria()) &&
                              $event.preventDefault()
                          "
                          (click)="
                            !(bloqueado || ocupado() || reconsultaObrigatoria()) &&
                              canalHorario.focus();
                            !(bloqueado || ocupado() || reconsultaObrigatoria()) &&
                              menuAberto.set(
                                menuAberto() === 'canal-' + horario.chave
                                  ? null
                                  : 'canal-' + horario.chave
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
                            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                            <rect x="9" y="3" width="6" height="4" rx="1" />
                          </svg>
                          <span class="bistro-select-val" aria-hidden="true">
                            {{ rotuloCanal(horario.canal) }}
                          </span>
                          <select
                            #canalHorario
                            [id]="campo(horario.chave, 'canal')"
                            class="bistro-select-native"
                            [value]="horario.canal"
                            (keydown.enter)="
                              $event.preventDefault();
                              !(bloqueado || ocupado() || reconsultaObrigatoria()) &&
                                menuAberto.set(
                                  menuAberto() === 'canal-' + horario.chave
                                    ? null
                                    : 'canal-' + horario.chave
                                )
                            "
                            (keydown.space)="
                              $event.preventDefault();
                              !(bloqueado || ocupado() || reconsultaObrigatoria()) &&
                                menuAberto.set(
                                  menuAberto() === 'canal-' + horario.chave
                                    ? null
                                    : 'canal-' + horario.chave
                                )
                            "
                            (keydown.escape)="menuAberto.set(null)"
                            (change)="
                              menuAberto.set(null); alterarCanal(horario.chave, canalHorario.value)
                            "
                          >
                            @for (canal of opcoesCanais; track canal.valor) {
                              <option
                                [value]="canal.valor"
                                [selected]="canal.valor === horario.canal"
                              >
                                {{ canal.rotulo }}
                              </option>
                            }
                          </select>
                          <svg
                            class="bistro-select-chev"
                            [class.rot]="menuAberto() === 'canal-' + horario.chave"
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
                        @if (
                          menuAberto() === 'canal-' + horario.chave &&
                          !(bloqueado || ocupado() || reconsultaObrigatoria())
                        ) {
                          <div class="bistro-select-popover" role="presentation">
                            <p class="bistro-select-popover-title">Canal de atendimento</p>
                            @for (canal of opcoesCanais; track canal.valor) {
                              <button
                                type="button"
                                class="bistro-select-opt"
                                [class.on]="canal.valor === horario.canal"
                                tabindex="-1"
                                (mousedown)="$event.preventDefault()"
                                (click)="
                                  selecionarCanalPopover(horario.chave, canal.valor, canalHorario)
                                "
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
                                    <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
                                    <rect x="9" y="3" width="6" height="4" rx="1" />
                                  </svg>
                                  <span>{{ canal.rotulo }}</span>
                                </span>
                                @if (canal.valor === horario.canal) {
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

                    <div class="s6-field s6-schedule-wide">
                      <label [for]="campo(horario.chave, 'dia')">Dia de início</label>
                      <div
                        class="bistro-select-wrap"
                        (focusout)="
                          !$any($event.currentTarget).contains($event.relatedTarget) &&
                            menuAberto() === 'dia-' + horario.chave &&
                            menuAberto.set(null)
                        "
                      >
                        <div
                          class="bistro-select-pill"
                          [class.open]="menuAberto() === 'dia-' + horario.chave"
                          [class.disabled]="bloqueado || ocupado() || reconsultaObrigatoria()"
                          (mousedown)="
                            !(bloqueado || ocupado() || reconsultaObrigatoria()) &&
                              $event.preventDefault()
                          "
                          (click)="
                            !(bloqueado || ocupado() || reconsultaObrigatoria()) && dia.focus();
                            !(bloqueado || ocupado() || reconsultaObrigatoria()) &&
                              menuAberto.set(
                                menuAberto() === 'dia-' + horario.chave
                                  ? null
                                  : 'dia-' + horario.chave
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
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                          </svg>
                          <span class="bistro-select-val" aria-hidden="true">
                            {{ rotuloDia(horario.diaSemana) }}
                          </span>
                          <select
                            #dia
                            [id]="campo(horario.chave, 'dia')"
                            class="bistro-select-native"
                            [value]="horario.diaSemana"
                            (keydown.enter)="
                              $event.preventDefault();
                              !(bloqueado || ocupado() || reconsultaObrigatoria()) &&
                                menuAberto.set(
                                  menuAberto() === 'dia-' + horario.chave
                                    ? null
                                    : 'dia-' + horario.chave
                                )
                            "
                            (keydown.space)="
                              $event.preventDefault();
                              !(bloqueado || ocupado() || reconsultaObrigatoria()) &&
                                menuAberto.set(
                                  menuAberto() === 'dia-' + horario.chave
                                    ? null
                                    : 'dia-' + horario.chave
                                )
                            "
                            (keydown.escape)="menuAberto.set(null)"
                            (change)="
                              menuAberto.set(null); alterarDia(horario.chave, dia.value)
                            "
                          >
                            @for (diaOpcao of dias; track diaOpcao.valor) {
                              <option
                                [value]="diaOpcao.valor"
                                [selected]="diaOpcao.valor === horario.diaSemana"
                              >
                                {{ diaOpcao.rotulo }}
                              </option>
                            }
                          </select>
                          <svg
                            class="bistro-select-chev"
                            [class.rot]="menuAberto() === 'dia-' + horario.chave"
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
                        @if (
                          menuAberto() === 'dia-' + horario.chave &&
                          !(bloqueado || ocupado() || reconsultaObrigatoria())
                        ) {
                          <div class="bistro-select-popover" role="presentation">
                            <p class="bistro-select-popover-title">Dia de início</p>
                            @for (diaOpcao of dias; track diaOpcao.valor) {
                              <button
                                type="button"
                                class="bistro-select-opt"
                                [class.on]="diaOpcao.valor === horario.diaSemana"
                                tabindex="-1"
                                (mousedown)="$event.preventDefault()"
                                (click)="
                                  selecionarDiaPopover(horario.chave, diaOpcao.valor, dia)
                                "
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
                                    <circle cx="12" cy="12" r="9" />
                                    <path d="M12 7v5l3 2" />
                                  </svg>
                                  <span>{{ diaOpcao.rotulo }}</span>
                                </span>
                                @if (diaOpcao.valor === horario.diaSemana) {
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
                      <label [for]="campo(horario.chave, 'inicio')">Início (HH:mm)</label>
                      <input
                        #inicio
                        [id]="campo(horario.chave, 'inicio')"
                        class="s6-mono-input"
                        type="text"
                        autocomplete="off"
                        placeholder="09:00"
                        maxlength="5"
                        pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                        required
                        [value]="horario.inicio"
                        (input)="alterarHora(horario.chave, 'inicio', inicio.value)"
                      />
                    </div>

                    <div class="s6-field">
                      <label [for]="campo(horario.chave, 'fim')">Fim (HH:mm ou 24:00)</label>
                      <input
                        #fim
                        [id]="campo(horario.chave, 'fim')"
                        class="s6-mono-input"
                        type="text"
                        autocomplete="off"
                        placeholder="18:00"
                        maxlength="5"
                        pattern="(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)"
                        required
                        [value]="horario.fim"
                        (input)="alterarHora(horario.chave, 'fim', fim.value)"
                      />
                    </div>
                  </div>

                  @if (horario.fim < horario.inicio) {
                    <div class="s6-amber">
                      <div class="s6-amber-row">
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
                          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                        </svg>
                        <small>Este horário termina no dia seguinte ao selecionado.</small>
                      </div>
                    </div>
                  }

                  <div class="s6-horario-actions">
                    <button
                      hlmBtn
                      variant="outline"
                      class="btn-cancelar-outline s6-btn-compact"
                      type="button"
                      (click)="remover(horario.chave)"
                    >
                      Remover horário {{ indice + 1 }}
                    </button>
                  </div>
                </fieldset>
              } @empty {
                <p class="bistro-empty">
                  Nenhum horário cadastrado. Todos os canais ficam fechados até que seus horários sejam definidos e habilitados.
                </p>
              }

              <div class="s6-schedule-footer">
                <p class="s6-note">{{ horarios().length }} de 84 horários cadastrados.</p>
                <div class="s6-schedule-footer-actions">
                  <button
                    hlmBtn
                    variant="outline"
                    type="button"
                    (click)="adicionar()"
                    [disabled]="
                      bloqueado ||
                      ocupado() ||
                      reconsultaObrigatoria() ||
                      horarios().length >= 84
                    "
                  >
                    Adicionar horário
                  </button>
                  <button
                    hlmBtn
                    [disabled]="bloqueado || ocupado() || reconsultaObrigatoria()"
                  >
                    Salvar funcionamento
                  </button>
                </div>
              </div>

              <p class="s6-note">
                Para salvar, confirme sua identidade no formulário acima. A confirmação vale por cinco minutos.
              </p>
            </form>
          }
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .s6-func-section {
      margin-top: 0.4rem;
      padding-top: 0.9rem;
      border-top: 1px dashed var(--border);
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
    .s6-func-heading {
      display: grid;
      gap: 0.2rem;
      min-width: 0;
    }
    .s6-func-heading h5 {
      margin: 0;
      font-size: 0.98rem;
      font-weight: 750;
      color: var(--foreground);
      overflow-wrap: anywhere;
    }
    .s6-head-actions {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }
    .s6-func-editor,
    .s6-func-form {
      display: grid;
      gap: 0.8rem;
      margin: 0;
      min-width: 0;
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
      background: var(--card);
      font-size: 0.85rem;
      color: var(--foreground);
      line-height: 1.48;
      overflow-wrap: anywhere;
    }
    .s6-amber {
      margin: 0;
      padding: 0.8rem 0.95rem;
      border: 1px solid var(--amber-border);
      border-radius: 0.8rem;
      background: var(--amber-bg);
      color: var(--amber-fg);
      font-size: 0.84rem;
      line-height: 1.45;
    }
    .s6-amber-row {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }
    .s6-amber-row svg {
      flex: none;
      margin-top: 2px;
    }
    .s6-amber-row small {
      font-size: 0.82rem;
      font-weight: 650;
      color: var(--amber-fg);
      overflow-wrap: anywhere;
    }
    .s6-func-meta-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.5rem;
    }
    .s6-badge {
      margin: 0;
      display: inline-flex;
      align-items: center;
      padding: 0.28rem 0.68rem;
      border-radius: 999px;
      font-size: 0.76rem;
      font-weight: 750;
      border: 1px solid var(--border);
      background: var(--secondary);
      color: var(--secondary-foreground);
    }
    .s6-week-strip {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 0.35rem;
    }
    .s6-day-pill {
      padding: 0.5rem 0.25rem;
      border-radius: 0.7rem;
      border: 1px solid var(--border);
      background: var(--card);
      color: var(--muted-foreground);
      text-align: center;
      font-size: 0.74rem;
      display: grid;
      justify-items: center;
      gap: 0.2rem;
      min-width: 0;
    }
    .s6-day-pill strong {
      font-size: 0.76rem;
      color: var(--foreground);
    }
    .s6-day-pill.on {
      background: var(--accent);
      border-color: var(--accent-border);
      color: var(--accent-foreground);
    }
    .s6-day-pill.on strong {
      color: var(--accent-foreground);
    }
    .s6-day-text {
      font-size: 0.68rem;
      font-weight: 700;
    }
    .s6-day-ico {
      display: none;
    }
    .s6-fieldset,
    .s6-schedule-fieldset {
      border: 1px solid var(--border);
      border-radius: 0.9rem;
      padding: 0.9rem;
      margin: 0;
      background: var(--card);
      display: grid;
      gap: 0.75rem;
      min-width: 0;
    }
    .s6-fieldset legend,
    .s6-schedule-fieldset legend {
      padding: 0 0.35rem;
      font-size: 0.82rem;
      font-weight: 750;
      color: var(--primary-ink);
    }
    .s6-channels-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 0.5rem;
    }
    .s6-tactile-row {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-height: 48px;
      padding: 0.65rem 0.8rem;
      border-radius: 0.8rem;
      border: 1px solid var(--border);
      background: var(--background);
      cursor: pointer;
      margin: 0;
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
      font-weight: 700;
      color: var(--foreground);
    }
    .s6-schedule-grid {
      display: grid;
      grid-template-columns: 1.1fr 1.35fr 0.78fr 0.78fr;
      gap: 0.6rem;
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
    .s6-mono-input {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.88rem;
    }
    .s6-horario-actions {
      display: flex;
      justify-content: flex-end;
    }
    .s6-schedule-footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      padding-top: 0.25rem;
    }
    .s6-schedule-footer-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      margin-left: auto;
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
    @media (max-width: 900px) {
      .s6-schedule-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }
    @media (max-width: 640px) {
      .s6-head-actions,
      .s6-head-actions button {
        width: 100%;
      }
      .s6-week-strip {
        gap: 0.22rem;
      }
      .s6-day-pill {
        padding: 0.42rem 0.1rem;
      }
      .s6-day-pill strong {
        font-size: 0.7rem;
      }
      .s6-day-text {
        display: none;
      }
      .s6-day-ico {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 16px;
      }
      .s6-channels-grid {
        grid-template-columns: minmax(0, 1fr);
      }
      .s6-schedule-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .s6-schedule-wide {
        grid-column: 1 / -1;
      }
      .s6-horario-actions button {
        width: 100%;
        border-radius: 0.75rem;
      }
      .s6-schedule-footer {
        flex-direction: column;
        align-items: stretch;
      }
      .s6-schedule-footer-actions {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        width: 100%;
        margin-left: 0;
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
export class FuncionamentoUnidadeComponent {
  @Input({ required: true }) unidadeId = '';
  @Input() nome = '';
  @Input() bloqueado = false;
  @Output() readonly bloqueio = new EventEmitter<boolean>();
  @Output() readonly salvo = new EventEmitter<void>();
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  private readonly sessao = inject(SessaoService);
  private readonly conta = this.sessao.identidade()?.usuarioId;
  private geracao = 0;
  private proximaChave = 0;
  private destruido = false;
  readonly aberto = signal(false);
  readonly ocupado = signal(false);
  readonly versao = signal<number | null>(null);
  readonly versaoUnidade = signal<number | null>(null);
  readonly fusoConsultado = signal('');
  readonly canais = signal<Canal[]>([]);
  readonly horarios = signal<LinhaHorario[]>([]);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly reconsultaObrigatoria = signal(false);
  readonly menuAberto = signal<string | null>(null);
  readonly diasSemanaResumo = [
    { valor: 1, sigla: 'Seg' },
    { valor: 2, sigla: 'Ter' },
    { valor: 3, sigla: 'Qua' },
    { valor: 4, sigla: 'Qui' },
    { valor: 5, sigla: 'Sex' },
    { valor: 6, sigla: 'Sáb' },
    { valor: 7, sigla: 'Dom' },
  ];
  readonly opcoesCanais: { valor: Canal; rotulo: string }[] = [
    { valor: 'DELIVERY', rotulo: 'Delivery' },
    { valor: 'RETIRADA', rotulo: 'Retirada' },
    { valor: 'MESA', rotulo: 'Mesa' },
  ];
  readonly dias = [
    { valor: 1, rotulo: 'Segunda-feira' },
    { valor: 2, rotulo: 'Terça-feira' },
    { valor: 3, rotulo: 'Quarta-feira' },
    { valor: 4, rotulo: 'Quinta-feira' },
    { valor: 5, rotulo: 'Sexta-feira' },
    { valor: 6, rotulo: 'Sábado' },
    { valor: 7, rotulo: 'Domingo' },
  ];

  constructor() {
    effect(() => {
      if (this.conta !== this.sessao.identidade()?.usuarioId) this.encerrar();
    });
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.encerrar();
    });
  }

  campo(chave: number, campo: string): string {
    return 'funcionamento-' + this.unidadeId + '-' + chave + '-' + campo;
  }

  async consultar(): Promise<void> {
    if (!this.podeIniciar()) return;
    this.aberto.set(true);
    const geracao = ++this.geracao;
    const unidade = this.unidadeId;
    this.iniciar();
    try {
      const dados = await this.sessao.api<Funcionamento>(this.rota(unidade));
      if (!this.vigente(geracao, unidade)) return;
      this.receber(dados, unidade);
      this.aviso.set('Funcionamento consultado no servidor. O rascunho usa a versão atual.');
    } catch (error) {
      if (this.vigente(geracao, unidade)) this.falhar(error, false);
    } finally {
      if (this.vigente(geracao, unidade)) this.finalizar();
    }
  }

  habilitar(canal: Canal, habilitado: boolean): void {
    if (!this.podeEditar()) return;
    this.canais.update((canais) =>
      this.opcoesCanais
        .map((opcao) => opcao.valor)
        .filter((valor) => (valor === canal ? habilitado : canais.includes(valor))),
    );
    this.aviso.set('');
  }

  adicionar(): void {
    if (!this.podeEditar() || this.horarios().length >= 84) return;
    this.horarios.update((horarios) => [
      ...horarios,
      {
        chave: this.proximaChave++,
        canal: this.canais()[0] ?? 'DELIVERY',
        diaSemana: 1,
        inicio: '09:00',
        fim: '18:00',
      },
    ]);
    this.aviso.set('');
  }

  remover(chave: number): void {
    if (!this.podeEditar()) return;
    this.horarios.update((horarios) => horarios.filter((horario) => horario.chave !== chave));
    this.aviso.set('');
  }

  alterarCanal(chave: number, canal: string): void {
    if (!this.opcoesCanais.some((opcao) => opcao.valor === canal)) return;
    this.alterar(chave, { canal: canal as Canal });
  }

  alterarDia(chave: number, dia: string): void {
    const diaSemana = Number(dia);
    if (!this.dias.some((opcao) => opcao.valor === diaSemana)) return;
    this.alterar(chave, { diaSemana });
  }

  alterarHora(chave: number, campo: 'inicio' | 'fim', valor: string): void {
    this.alterar(chave, { [campo]: valor });
  }

  diaTemHorario(dia: number): boolean {
    return this.horarios().some((h) => h.diaSemana === dia);
  }

  rotuloCanal(canal: Canal): string {
    return this.opcoesCanais.find((c) => c.valor === canal)?.rotulo ?? canal;
  }

  rotuloDia(dia: number): string {
    return this.dias.find((d) => d.valor === dia)?.rotulo ?? String(dia);
  }

  selecionarCanalPopover(chave: number, canal: Canal, selectEl?: HTMLSelectElement): void {
    this.menuAberto.set(null);
    this.alterarCanal(chave, canal);
    if (selectEl) {
      selectEl.value = canal;
      selectEl.focus();
    }
  }

  selecionarDiaPopover(chave: number, dia: number, selectEl?: HTMLSelectElement): void {
    this.menuAberto.set(null);
    this.alterarDia(chave, String(dia));
    if (selectEl) {
      selectEl.value = String(dia);
      selectEl.focus();
    }
  }

  async salvar(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.podeEditar()) return;
    const geracao = ++this.geracao;
    const unidade = this.unidadeId;
    const body = {
      versao: this.versao(),
      versaoUnidade: this.versaoUnidade(),
      canais: [...this.canais()],
      horarios: this.horarios().map(({ canal, diaSemana, inicio, fim }) => ({
        canal,
        diaSemana,
        inicio,
        fim,
      })),
    };
    this.iniciar();
    try {
      const dados = await this.sessao.api<Funcionamento>(this.rota(unidade), 'PUT', body);
      if (!this.vigente(geracao, unidade)) return;
      this.receber(dados, unidade);
      this.aviso.set('Funcionamento salvo no servidor.');
      this.salvo.emit();
    } catch (error) {
      if (this.vigente(geracao, unidade)) this.falhar(error, true);
    } finally {
      if (this.vigente(geracao, unidade)) this.finalizar();
    }
  }

  private alterar(chave: number, valores: Partial<Horario>): void {
    if (!this.podeEditar()) return;
    this.horarios.update((horarios) =>
      horarios.map((horario) => (horario.chave === chave ? { ...horario, ...valores } : horario)),
    );
    this.aviso.set('');
  }

  private podeIniciar(): boolean {
    return !this.bloqueado && !this.ocupado() && this.vigente(this.geracao, this.unidadeId);
  }

  private podeEditar(): boolean {
    return (
      this.podeIniciar() &&
      this.versao() !== null &&
      this.versaoUnidade() !== null &&
      !this.reconsultaObrigatoria()
    );
  }

  private vigente(geracao: number, unidade: string): boolean {
    return (
      !this.destruido &&
      geracao === this.geracao &&
      unidade === this.unidadeId &&
      !!this.conta &&
      this.conta === this.sessao.identidade()?.usuarioId
    );
  }

  private rota(unidade: string): string {
    return '/api/v1/configuracoes/unidades/' + encodeURIComponent(unidade) + '/funcionamento';
  }

  private iniciar(): void {
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.bloqueio.emit(true);
  }

  private finalizar(): void {
    this.ocupado.set(false);
    this.bloqueio.emit(false);
  }

  private receber(dados: Funcionamento, unidade: string): void {
    if (dados.unidadeId !== unidade) throw new Error('A resposta não corresponde à unidade.');
    this.versao.set(dados.versao);
    this.versaoUnidade.set(dados.versaoUnidade);
    this.fusoConsultado.set(dados.fuso);
    this.canais.set([...dados.canais]);
    this.horarios.set(
      dados.horarios.map((horario) => ({ ...horario, chave: this.proximaChave++ })),
    );
    this.reconsultaObrigatoria.set(false);
  }

  private falhar(error: unknown, escrita: boolean): void {
    const falha = error instanceof ApiFailure ? error : null;
    const reautenticar = falha?.status === 403 && falha.codigo === 'REAUTENTICACAO_NECESSARIA';
    if (falha && [401, 403, 404].includes(falha.status) && !reautenticar) {
      this.versao.set(null);
      this.versaoUnidade.set(null);
      this.fusoConsultado.set('');
      this.canais.set([]);
      this.horarios.set([]);
    }
    // Falha incerta ou conflito nunca permite reenviar a versão sem consultar.
    this.reconsultaObrigatoria.set(
      !escrita || !falha || falha.status >= 500 || falha.status === 409,
    );
    this.erro.set(
      reautenticar
        ? 'Confirme sua identidade no formulário acima antes de salvar o funcionamento.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível confirmar o funcionamento. Consulte o servidor antes de continuar.',
    );
    const geracao = this.geracao;
    const unidade = this.unidadeId;
    setTimeout(() => {
      if (this.vigente(geracao, unidade)) this.alerta?.nativeElement.focus();
    });
  }

  private encerrar(): void {
    this.geracao++;
    this.aberto.set(false);
    this.versao.set(null);
    this.versaoUnidade.set(null);
    this.fusoConsultado.set('');
    this.canais.set([]);
    this.horarios.set([]);
    this.erro.set('');
    this.aviso.set('');
    this.reconsultaObrigatoria.set(false);
    if (this.ocupado() && !this.destruido) this.bloqueio.emit(false);
    this.ocupado.set(false);
  }
}
