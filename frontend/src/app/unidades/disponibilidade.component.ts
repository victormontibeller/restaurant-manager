import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { HlmButton } from '../ui/button';

type Canal = 'DELIVERY' | 'RETIRADA' | 'MESA';

interface UnidadePublica {
  id: string;
  nome: string;
  fuso: string;
}

interface HorarioPublico {
  canal: Canal;
  diaSemana: number;
  inicio: string;
  fim: string;
}

interface FuncionamentoPublico {
  unidadeId: string;
  nome: string;
  fuso: string;
  consultadoEm: string;
  canais: { canal: Canal; habilitado: boolean; aberto: boolean }[];
  horarios: HorarioPublico[];
}

@Component({
  selector: 'app-disponibilidade',
  imports: [HlmButton],
  template: `
    <section
      class="disp-raiz"
      aria-labelledby="disponibilidade-titulo"
      [attr.aria-busy]="carregando()"
    >
      <header class="disp-topo">
        <div>
          <span class="disp-sobretitulo">Horários da casa</span>
          <h2 id="disponibilidade-titulo">Unidades e horários</h2>
          <p class="disp-sub">
            Escolha a unidade para consultar os canais e horários de atendimento.
          </p>
        </div>
        <button
          hlmBtn
          variant="outline"
          size="sm"
          type="button"
          (click)="carregar()"
          [disabled]="carregandoLista()"
        >
          Atualizar lista de unidades
        </button>
      </header>
      <div class="disp-controles">
        <div class="disp-campo">
          <label for="unidade-publica">Unidade</label>
          <div
            class="bistro-select-wrap"
            (focusout)="
              !$any($event.currentTarget).contains($event.relatedTarget) &&
                (menuUnidade.checked = false)
            "
          >
            <input #menuUnidade type="checkbox" hidden />
            <div
              class="bistro-select-pill"
              [class.open]="menuUnidade.checked"
              [class.disabled]="carregandoLista()"
              (mousedown)="!carregandoLista() && $event.preventDefault()"
              (click)="
                !carregandoLista() && seletor.focus();
                !carregandoLista() && (menuUnidade.checked = !menuUnidade.checked)
              "
            >
              <svg
                class="bistro-select-ico"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z"
                />
                <circle
                  cx="12"
                  cy="10.5"
                  r="2.3"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                />
              </svg>
              <span class="bistro-select-val" aria-hidden="true">{{ nomeSelecionada() }}</span>
              <select
                id="unidade-publica"
                #seletor
                class="sr-select"
                [value]="selecionada()"
                [disabled]="carregandoLista()"
                (keydown.enter)="$event.preventDefault(); menuUnidade.checked = !menuUnidade.checked"
                (keydown.space)="$event.preventDefault(); menuUnidade.checked = !menuUnidade.checked"
                (keydown.escape)="menuUnidade.checked = false"
                (change)="menuUnidade.checked = false; selecionar(seletor.value)"
              >
                <option value="">Selecione uma unidade</option>
                @for (unidade of unidades(); track unidade.id) {
                  <option [value]="unidade.id" [selected]="unidade.id === selecionada()">
                    {{ unidade.nome }}
                  </option>
                }
              </select>
              <svg
                class="bistro-select-chev"
                [class.rot]="menuUnidade.checked"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.4"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="m6 9 6 6 6-6"
                />
              </svg>
            </div>
            @if (menuUnidade.checked && !carregandoLista()) {
              <div class="bistro-select-popover" role="presentation">
                <p class="bistro-select-popover-title">Escolha a unidade</p>
                <button
                  type="button"
                  class="bistro-select-opt"
                  [class.on]="selecionada() === ''"
                  tabindex="-1"
                  (mousedown)="$event.preventDefault()"
                  (click)="
                    menuUnidade.checked = false;
                    seletor.value = '';
                    selecionar('');
                    seletor.focus()
                  "
                >
                  <span class="bistro-select-opt-main">
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z"
                      />
                      <circle
                        cx="12"
                        cy="10.5"
                        r="2.3"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                      />
                    </svg>
                    <span>Selecione uma unidade</span>
                  </span>
                  @if (selecionada() === '') {
                    <span class="bistro-select-opt-check" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24">
                        <path
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2.8"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="m5 12.5 4.5 4.5L19 7.5"
                        />
                      </svg>
                    </span>
                  }
                </button>
                @for (unidade of unidades(); track unidade.id) {
                  <button
                    type="button"
                    class="bistro-select-opt"
                    [class.on]="unidade.id === selecionada()"
                    tabindex="-1"
                    (mousedown)="$event.preventDefault()"
                    (click)="
                      menuUnidade.checked = false;
                      seletor.value = unidade.id;
                      selecionar(unidade.id);
                      seletor.focus()
                    "
                  >
                    <span class="bistro-select-opt-main">
                      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z"
                        />
                        <circle
                          cx="12"
                          cy="10.5"
                          r="2.3"
                          fill="none"
                          stroke="currentColor"
                          stroke-width="2"
                        />
                      </svg>
                      <span>{{ unidade.nome }}</span>
                    </span>
                    @if (unidade.id === selecionada()) {
                      <span class="bistro-select-opt-check" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 24 24">
                          <path
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="m5 12.5 4.5 4.5L19 7.5"
                          />
                        </svg>
                      </span>
                    }
                  </button>
                }
              </div>
            }
          </div>
        </div>
        <button
          hlmBtn
          variant="outline"
          size="sm"
          type="button"
          (click)="selecionar(selecionada())"
          [disabled]="!selecionada() || carregando()"
        >
          Atualizar horários
        </button>
      </div>
      <p role="status" class="disp-status">{{ estado() }}</p>
      @if (erro()) {
        <p role="alert" class="erro">{{ erro() }}</p>
      }
      @if (atual(); as unidade) {
        <div class="disp-unidade">
          <h3>{{ unidade.nome }}</h3>
          <p class="disp-meta">
            Fuso da unidade: {{ unidade.fuso }} · Horário consultado às {{ confirmado() }}.
          </p>
          <p class="disp-aviso">
            A situação corresponde ao horário consultado. A disponibilidade é conferida novamente ao
            enviar o pedido.
          </p>
        </div>
        <div class="canais">
          @for (canal of unidade.canais; track canal.canal) {
            <article class="canal-cartao">
              <header class="canal-topo">
                <h4>{{ nomeCanal(canal.canal) }}</h4>
                <span
                  class="canal-badge"
                  [attr.data-aberto]="
                    !canal.habilitado ? 'desabilitado' : canal.aberto ? 'aberto' : 'fechado'
                  "
                >
                  {{
                    !canal.habilitado
                      ? 'Canal desabilitado'
                      : canal.aberto
                        ? 'Aberto no horário consultado'
                        : 'Fechado no horário consultado'
                  }}
                </span>
              </header>
              @if (canal.habilitado) {
                <ul class="disp-lista" [attr.aria-label]="'Horários de ' + nomeCanal(canal.canal)">
                  @for (horario of horariosDo(canal.canal); track $index) {
                    <li>
                      {{ nomeDia(horario.diaSemana) }}: {{ horario.inicio }} às {{ horario.fim
                      }}{{ madrugada(horario) ? ' do dia seguinte' : '' }}
                    </li>
                  } @empty {
                    <li class="disp-vazio">Sem horários configurados; atendimento fechado.</li>
                  }
                </ul>
              }
            </article>
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
    .disp-raiz {
      display: grid;
      gap: 0.9rem;
    }
    .disp-topo {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .disp-topo > div {
      flex: 1 1 14rem;
      min-width: 0;
    }
    .disp-sobretitulo {
      display: inline-block;
      font-size: 0.7rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--primary-ink, #a53e2b);
    }
    h2 {
      margin: 0.15rem 0 0.25rem;
      font-size: 1.25rem;
      font-weight: 750;
      letter-spacing: -0.025em;
      color: var(--foreground, #292521);
    }
    .disp-sub,
    .disp-status,
    .disp-meta,
    .disp-aviso {
      margin: 0;
      font-size: 0.88rem;
      color: var(--muted-foreground, #6e6259);
    }
    .disp-controles {
      display: flex;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .disp-campo {
      flex: 1 1 16rem;
      max-width: 30rem;
      min-width: 0;
    }
    .disp-campo > label {
      display: block;
      margin: 0 0 0.35rem;
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--foreground, #292521);
    }
    .disp-unidade {
      display: grid;
      gap: 0.25rem;
      padding-top: 0.25rem;
    }
    .disp-unidade h3 {
      margin: 0;
      font-size: 1.12rem;
      color: var(--foreground, #292521);
    }
    .canais {
      display: grid;
      gap: 0.9rem;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 15.5rem), 1fr));
    }
    .canal-cartao {
      border: 1px solid var(--border, #e5ded3);
      background: var(--background, #faf7f2);
      border-radius: 1rem;
      padding: 1rem;
      min-width: 0;
      display: grid;
      align-content: start;
      gap: 0.75rem;
    }
    .canal-topo {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0.4rem;
    }
    h4 {
      margin: 0;
      font-size: 1rem;
      color: var(--foreground, #292521);
    }
    .canal-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.28rem 0.65rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 750;
      line-height: 1.3;
    }
    .canal-badge[data-aberto='aberto'] {
      background: var(--accent, #e8efe7);
      color: var(--accent-foreground, #30523b);
    }
    .canal-badge[data-aberto='fechado'] {
      background: var(--danger-bg, #fae9e6);
      color: var(--danger-fg, #9c2323);
    }
    .canal-badge[data-aberto='desabilitado'] {
      background: var(--secondary, #f0ebe3);
      color: var(--muted-foreground, #594e46);
    }
    .disp-lista {
      list-style: none;
      padding: 0;
      margin: 0;
      display: grid;
      gap: 0.15rem;
    }
    .disp-lista li {
      padding: 0.42rem 0;
      border-bottom: 1px dotted var(--input, #c6b9aa);
      font-size: 0.86rem;
      color: var(--foreground, #292521);
      font-variant-numeric: tabular-nums;
    }
    .disp-lista li:last-child {
      border-bottom: 0;
      padding-bottom: 0;
    }
    .disp-vazio {
      color: var(--muted-foreground, #6e6259);
      border-bottom: 0;
    }
    p,
    h3,
    li,
    button {
      overflow-wrap: anywhere;
    }
    button {
      max-width: 100%;
      white-space: normal;
    }
    .erro {
      margin: 0;
      padding: 0.85rem 1rem;
      border: 1px solid var(--danger-border, #ebc9c4);
      border-radius: 0.75rem;
      background: var(--danger-bg, #fff5f3);
      color: var(--danger-fg, #ad2929);
      font-weight: 600;
    }
    .sr-select {
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      min-height: 0 !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      border: 0 !important;
    }
    .bistro-select-wrap {
      position: relative;
      display: inline-flex;
      width: 100%;
    }
    .bistro-select-pill {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
      min-width: 0;
      min-height: 50px;
      padding: 0 44px 0 16px;
      border-radius: 999px;
      border: 1px solid var(--input, #ded5c8);
      background-color: var(--card, #ffffff);
      box-shadow: 0 3px 0 var(--border, #e5ded3);
      color: var(--foreground, #292521);
      gap: 10px;
      margin: 0;
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      transition:
        border-color 0.15s ease,
        box-shadow 0.15s ease,
        background-color 0.15s ease;
    }
    .bistro-select-pill:hover {
      border-color: var(--primary-ink, #a53e2b);
      background-color: var(--popover, #fffdfa);
    }
    .bistro-select-pill.open,
    .bistro-select-pill:focus-within {
      border-color: var(--primary-ink, #a53e2b);
      box-shadow:
        0 0 0 3px var(--primary-soft, #fbefec),
        0 3px 0 var(--primary-soft-border, #e3bfb7);
    }
    .bistro-select-pill.disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .bistro-select-pill.disabled:hover {
      border-color: var(--input, #ded5c8);
      background-color: var(--card, #ffffff);
    }
    .bistro-select-pill select.sr-select {
      appearance: none !important;
      -webkit-appearance: none !important;
      pointer-events: none;
      outline: none;
    }
    .bistro-select-ico {
      color: var(--primary-ink, #a53e2b);
      flex: none;
    }
    .bistro-select-val {
      font-size: 15px;
      font-weight: 700;
      color: var(--foreground, #292521);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .bistro-select-chev {
      position: absolute;
      right: 16px;
      color: var(--primary-ink, #a53e2b);
      pointer-events: none;
      transition: transform 0.18s ease;
    }
    .bistro-select-chev.rot {
      transform: rotate(180deg);
    }
    .bistro-select-popover {
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      min-width: min(220px, 100%);
      max-width: min(100%, calc(100vw - 32px));
      max-height: min(320px, 55vh);
      overflow-y: auto;
      padding: 8px;
      border-radius: 20px;
      border: 1px solid var(--border, #ded5c8);
      background-color: var(--popover, var(--card, #ffffff));
      box-shadow:
        0 20px 44px -12px rgba(41, 37, 33, 0.2),
        0 4px 12px rgba(41, 37, 33, 0.08);
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .bistro-select-popover-title {
      margin: 0;
      padding: 6px 12px 4px;
      font-size: 10.5px;
      font-weight: 750;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--muted-foreground, #6e6259);
    }
    .bistro-select-opt {
      min-height: 48px !important;
      padding: 8px 12px !important;
      border-radius: 13px !important;
      border: 0 !important;
      background-color: transparent !important;
      color: var(--foreground, #292521) !important;
      display: flex !important;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      width: 100%;
      font-size: 14.5px !important;
      font-weight: 600 !important;
      text-align: left;
      box-shadow: none !important;
      cursor: pointer;
    }
    .bistro-select-opt:hover {
      background-color: var(--secondary, #f0ebe3) !important;
    }
    .bistro-select-opt.on {
      background-color: var(--primary-soft, #fbefec) !important;
      color: var(--primary-ink, #a53e2b) !important;
      font-weight: 750 !important;
    }
    .bistro-select-opt-main {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
    }
    .bistro-select-opt-main svg {
      color: var(--primary-ink, #a53e2b);
      flex: none;
    }
    .bistro-select-opt-check {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background-color: var(--primary, #a53e2b);
      color: #ffffff;
      display: grid;
      place-items: center;
      flex: none;
    }
    @media (max-width: 520px) {
      .disp-controles > button {
        width: 100%;
      }
      .bistro-select-pill {
        min-height: 48px;
        padding: 0 38px 0 14px;
        gap: 8px;
      }
      .bistro-select-val {
        font-size: 14px;
      }
      .bistro-select-chev {
        right: 12px;
      }
      .bistro-select-popover {
        left: 0;
        right: 0;
        max-width: 100%;
      }
    }
  `,
})
export class DisponibilidadeComponent implements OnInit, OnDestroy {
  readonly unidades = signal<UnidadePublica[]>([]);
  readonly selecionada = signal('');
  readonly atual = signal<FuncionamentoPublico | null>(null);
  readonly confirmado = signal('');
  readonly carregando = signal(false);
  readonly carregandoLista = signal(false);
  readonly estado = signal('Carregando unidades…');
  readonly erro = signal('');
  private geracao = 0;
  private destruido = false;
  private requisicao?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private expiraEm = 0;
  private pendenteSync = '';

  sincronizarUnidade(id: string): void {
    const alvo = (id || '').trim();
    if (!alvo) return;
    this.pendenteSync = alvo;
    if (this.unidades().some((u) => u.id === alvo) && this.selecionada() !== alvo) {
      void this.selecionar(alvo);
    }
  }

  private readonly desconectar = (): void => {
    this.limpar();
    this.estado.set('Sem conexão. Atualize os horários quando a conexão voltar.');
  };

  private readonly conferirValidade = (): void => {
    if (this.atual() && Date.now() >= this.expiraEm) this.expirar();
  };

  ngOnInit(): void {
    window.addEventListener('offline', this.desconectar);
    window.addEventListener('focus', this.conferirValidade);
    document.addEventListener('visibilitychange', this.conferirValidade);
    void this.carregar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.limpar();
    window.removeEventListener('offline', this.desconectar);
    window.removeEventListener('focus', this.conferirValidade);
    document.removeEventListener('visibilitychange', this.conferirValidade);
  }

  async carregar(): Promise<void> {
    const geracao = this.limpar();
    this.unidades.set([]);
    this.selecionada.set('');
    this.carregandoLista.set(true);
    this.carregando.set(true);
    this.estado.set('Carregando unidades…');
    try {
      const unidades = await this.consultar<UnidadePublica[]>('/api/v1/unidades');
      if (!this.vigente(geracao)) return;
      if (!Array.isArray(unidades)) throw new Error('Resposta inválida.');
      this.unidades.set(unidades);
      this.estado.set(
        unidades.length ? 'Selecione uma unidade.' : 'Nenhuma unidade disponível no momento.',
      );
      if (this.pendenteSync && unidades.some((u) => u.id === this.pendenteSync)) {
        const destino = this.pendenteSync;
        setTimeout(() => {
          if (!this.destruido && this.selecionada() !== destino) void this.selecionar(destino);
        });
      }
    } catch {
      if (!this.vigente(geracao)) return;
      this.estado.set('Consulta de unidades indisponível.');
      this.erro.set(
        'Não foi possível consultar as unidades. Verifique a conexão e tente novamente.',
      );
    } finally {
      if (this.vigente(geracao)) {
        this.carregandoLista.set(false);
        this.carregando.set(false);
      }
    }
  }

  async selecionar(id: string): Promise<void> {
    const geracao = this.limpar();
    const unidade = this.unidades().find((item) => item.id === id);
    this.selecionada.set(unidade ? id : '');
    if (unidade) {
      this.pendenteSync = unidade.id;
      try {
        if (typeof CustomEvent === 'function' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('rm-unidade-consulta', { detail: unidade.id }));
        }
      } catch {
        /* Ambiente sem CustomEvent ignora sincronização cruzada. */
      }
    }
    if (!unidade) {
      this.estado.set('Selecione uma unidade.');
      return;
    }
    this.carregando.set(true);
    this.estado.set('Consultando horários…');
    try {
      const atual = await this.consultar<FuncionamentoPublico>(
        '/api/v1/unidades/' + encodeURIComponent(id) + '/funcionamento',
      );
      if (!this.vigente(geracao)) return;
      if (atual.unidadeId !== id || !Array.isArray(atual.canais) || !Array.isArray(atual.horarios))
        throw new Error('Resposta inválida.');
      const confirmado = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: atual.fuso,
      }).format(new Date(atual.consultadoEm));
      this.atual.set(atual);
      this.confirmado.set(confirmado);
      this.estado.set('Horários consultados. Atualize para conferir mudanças.');
      this.expiraEm = Date.now() + 60000;
      this.timer = setTimeout(() => this.expirar(), 60000);
    } catch {
      if (!this.vigente(geracao)) return;
      this.estado.set('Horários indisponíveis para consulta.');
      this.erro.set(
        'Não foi possível consultar esta unidade. Verifique a conexão ou recarregue as unidades disponíveis.',
      );
    } finally {
      if (this.vigente(geracao)) this.carregando.set(false);
    }
  }

  nomeSelecionada(): string {
    return (
      this.unidades().find((item) => item.id === this.selecionada())?.nome ??
      'Selecione uma unidade'
    );
  }

  nomeCanal(canal: Canal): string {
    return { DELIVERY: 'Delivery', RETIRADA: 'Retirada', MESA: 'Mesa' }[canal];
  }

  nomeDia(dia: number): string {
    return [
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
      'Domingo',
    ][dia - 1];
  }

  horariosDo(canal: Canal): HorarioPublico[] {
    return this.atual()?.horarios.filter((horario) => horario.canal === canal) ?? [];
  }

  madrugada(horario: HorarioPublico): boolean {
    return horario.fim < horario.inicio;
  }

  private vigente(geracao: number): boolean {
    return !this.destruido && geracao === this.geracao;
  }

  private limpar(): number {
    this.geracao++;
    this.requisicao?.abort();
    clearTimeout(this.timer);
    this.atual.set(null);
    this.confirmado.set('');
    this.erro.set('');
    this.carregando.set(false);
    this.carregandoLista.set(false);
    return this.geracao;
  }

  private expirar(): void {
    if (this.destruido) return;
    this.limpar();
    this.estado.set('Consulta desatualizada. Atualize os horários para consultar novamente.');
  }

  private async consultar<T>(url: string): Promise<T> {
    this.requisicao = new AbortController();
    const response = await fetch(url, {
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.any([this.requisicao.signal, AbortSignal.timeout(8000)]),
    });
    if (!response.ok) throw new Error('Consulta indisponível.');
    return response.json() as Promise<T>;
  }
}
