import { DatePipe } from '@angular/common';
import { Component, DestroyRef, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';

interface Unidade {
  id: string;
  nome: string;
  fuso: string;
}

interface Atual extends Unidade {
  versao: string;
}

interface Evento {
  versao: string;
  tipo: string;
  nome: string;
  fuso: string;
  ativa: boolean;
  ocorridoEm: string;
}

interface Pagina {
  unidade: Atual;
  eventos: Evento[];
  proximo: string;
  temMais: boolean;
}

@Component({
  selector: 'app-eventos-unidade',
  imports: [HlmButton],
  template: `
    <section class="s6-stack" aria-labelledby="eventos-titulo">
      <div class="s6-card">
        <div class="s6-head">
          <div class="s6-title-wrap">
            <p class="eyebrow">01 · MONITORAMENTO CADASTRAL</p>
            <h3 id="eventos-titulo">Atualizações da unidade</h3>
          </div>
          <div class="s6-head-actions">
            <span
              class="s6-badge"
              [class.s6-badge-ok]="statusVariante() === 'ok'"
              [class.s6-badge-warn]="statusVariante() === 'warn'"
            >
              <span class="s6-dot" aria-hidden="true"></span>
              {{
                statusVariante() === 'ok'
                  ? 'Ao vivo · 5s'
                  : statusVariante() === 'warn'
                    ? 'Reconectando…'
                    : 'Aguardando'
              }}
            </span>
            <button
              hlmBtn
              variant="outline"
              type="button"
              (click)="carregar()"
              [disabled]="ocupado() || exportando()"
            >
              Recarregar unidades permitidas
            </button>
          </div>
        </div>

        <p class="s6-note">
          Acompanhamento cadastral com consulta automática. Não inclui pedidos, pagamentos ou dados de clientes.
        </p>

        <div class="s6-field">
          <label for="unidade-eventos">Unidade acompanhada</label>
          <div
            class="bistro-select-wrap"
            (focusout)="
              !$any($event.currentTarget).contains($event.relatedTarget) &&
                menuUnidadeAberto.set(false)
            "
          >
            <div
              class="bistro-select-pill"
              [class.open]="menuUnidadeAberto()"
              (mousedown)="$event.preventDefault()"
              (click)="seletor.focus(); menuUnidadeAberto.set(!menuUnidadeAberto())"
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
                <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z" />
                <circle cx="12" cy="10.5" r="2.3" />
              </svg>
              <span class="bistro-select-val" aria-hidden="true">{{ nomeUnidadeSelecionada() }}</span>
              <select
                id="unidade-eventos"
                #seletor
                class="bistro-select-native"
                [value]="selecionada()"
                (keydown.enter)="$event.preventDefault(); menuUnidadeAberto.set(!menuUnidadeAberto())"
                (keydown.space)="$event.preventDefault(); menuUnidadeAberto.set(!menuUnidadeAberto())"
                (keydown.escape)="menuUnidadeAberto.set(false)"
                (change)="menuUnidadeAberto.set(false); selecionar(seletor.value)"
              >
                <option value="" [selected]="selecionada() === ''">Selecione uma unidade</option>
                @for (unidade of unidades(); track unidade.id) {
                  <option [value]="unidade.id" [selected]="unidade.id === selecionada()">
                    {{ unidade.nome }}
                  </option>
                }
              </select>
              <svg
                class="bistro-select-chev"
                [class.rot]="menuUnidadeAberto()"
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
            @if (menuUnidadeAberto()) {
              <div class="bistro-select-popover" role="presentation">
                <p class="bistro-select-popover-title">Unidade acompanhada</p>
                <button
                  type="button"
                  class="bistro-select-opt"
                  [class.on]="selecionada() === ''"
                  tabindex="-1"
                  (mousedown)="$event.preventDefault()"
                  (click)="selecionarUnidadePopover('', seletor)"
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
                      <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z" />
                      <circle cx="12" cy="10.5" r="2.3" />
                    </svg>
                    <span>Selecione uma unidade</span>
                  </span>
                  @if (selecionada() === '') {
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
                @for (unidade of unidades(); track unidade.id) {
                  <button
                    type="button"
                    class="bistro-select-opt"
                    [class.on]="unidade.id === selecionada()"
                    tabindex="-1"
                    (mousedown)="$event.preventDefault()"
                    (click)="selecionarUnidadePopover(unidade.id, seletor)"
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
                        <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z" />
                        <circle cx="12" cy="10.5" r="2.3" />
                      </svg>
                      <span>
                        {{ unidade.nome }}@if (unidade.fuso) { ({{ unidade.fuso }})}
                      </span>
                    </span>
                    @if (unidade.id === selecionada()) {
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

        <p role="status" class="s6-callout">{{ estado() }}</p>
        @if (erro()) {
          <p #alerta role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
        }
      </div>

      @if (atual(); as unidade) {
        <div class="s6-talao">
          <div class="s6-head">
            <div class="s6-title-wrap">
              <p class="eyebrow">CADASTRO ATUAL</p>
              <p data-testid="unidade-atual" class="s6-atual-title">
                <strong>{{ unidade.nome }}</strong> · {{ unidade.fuso }} · versão {{ unidade.versao }}
              </p>
              <p class="s6-note">
                Última consulta confirmada: {{ confirmado() }}. Revalidação a cada cinco segundos enquanto esta tela estiver aberta.
              </p>
            </div>
            <div class="s6-head-actions">
              <button
                hlmBtn
                type="button"
                (click)="exportar()"
                [disabled]="ocupado() || exportando()"
              >
                {{ exportando() ? 'Consultando para exportar…' : 'Exportar cadastro da unidade (JSON)' }}
              </button>
            </div>
          </div>
          <p class="s6-note">
            O arquivo contém somente identificação, nome, fuso e versão, após nova autorização no servidor. Não inclui histórico, funcionários ou dados de clientes.
          </p>
        </div>

        <div class="s6-card">
          <div class="s6-sec-line">
            <span class="s6-sec-num">02 · LINHA DO TEMPO CADASTRAL</span>
            <span class="s6-sec-dotted"></span>
            <span class="s6-badge">{{ eventos().length }} alterações</span>
          </div>

          @if (eventos().length === 0) {
            <p class="bistro-empty">
              Nenhuma alteração registrada desde o início deste acompanhamento.
            </p>
          } @else {
            <ol class="s6-timeline-ol" aria-label="Alterações cadastrais recebidas">
              @for (evento of eventos(); track evento.versao) {
                <li class="s6-timeline-li">
                  <div class="s6-head">
                    <span
                      class="s6-badge"
                      [class.s6-badge-ok]="evento.tipo === 'UNIDADE_CRIADA'"
                      [class.s6-badge-terra]="evento.tipo !== 'UNIDADE_CRIADA'"
                    >
                      {{ evento.tipo === 'UNIDADE_CRIADA' ? 'Unidade criada' : 'Cadastro alterado' }}
                    </span>
                    <span class="s6-badge">
                      versão {{ evento.versao }}
                      @if (formatarDataEvento(evento.ocorridoEm); as dataFmt) {
                        · {{ dataFmt }}
                      }
                    </span>
                  </div>
                  <strong class="s6-timeline-desc">
                    {{ evento.nome }} · {{ evento.fuso }} · {{ evento.ativa ? 'ativa' : 'inativa' }}
                  </strong>
                </li>
              }
            </ol>
            <p class="s6-note">
              Exibidas até cinquenta alterações recentes desta consulta. O histórico permanece no servidor.
            </p>
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
    .s6-stack {
      display: grid;
      gap: 1rem;
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
    .s6-head h3 {
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
    .s6-atual-title {
      margin: 0.1rem 0;
      font-size: 1.06rem;
      color: var(--foreground);
      overflow-wrap: anywhere;
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
    .s6-badge-terra {
      background: var(--primary-soft);
      border-color: var(--primary-soft-border);
      color: var(--primary-ink);
    }
    .s6-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
      flex: none;
    }
    .s6-timeline-ol {
      list-style: none;
      margin: 0;
      padding: 0 0 0 1.25rem;
      border-left: 2px dashed var(--border);
      display: grid;
      gap: 0.75rem;
      min-width: 0;
    }
    .s6-timeline-li {
      position: relative;
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 0.85rem;
      padding: 0.8rem 0.95rem;
      display: grid;
      gap: 0.45rem;
      min-width: 0;
    }
    .s6-timeline-li::before {
      content: '';
      position: absolute;
      left: -1.63rem;
      top: 1.05rem;
      width: 11px;
      height: 11px;
      border-radius: 50%;
      background: var(--primary);
      border: 2px solid var(--card);
    }
    .s6-timeline-desc {
      font-size: 0.9rem;
      color: var(--foreground);
      overflow-wrap: anywhere;
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
    @media (max-width: 640px) {
      .s6-card,
      .s6-talao {
        padding: 0.95rem;
      }
      .s6-head-actions {
        width: 100%;
      }
      .s6-head-actions button {
        width: 100%;
      }
      .s6-sec-dotted {
        display: none;
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
export class EventosUnidadeComponent {
  private readonly sessao = inject(SessaoService);
  private readonly conta = this.sessao.identidade()?.usuarioId;
  private geracao = 0;
  private destruido = false;
  private timer?: ReturnType<typeof setTimeout>;
  private cursor = '-1';
  readonly unidades = signal<Unidade[]>([]);
  readonly selecionada = signal('');
  readonly atual = signal<Atual | null>(null);
  readonly eventos = signal<Evento[]>([]);
  readonly estado = signal('Carregando unidades permitidas…');
  readonly erro = signal('');
  readonly ocupado = signal(false);
  readonly exportando = signal(false);
  readonly confirmado = signal('');
  readonly menuUnidadeAberto = signal(false);
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.geracao++;
      clearTimeout(this.timer);
    });
    void this.carregar();
  }

  private vigente(geracao: number): boolean {
    return (
      !this.destruido &&
      geracao === this.geracao &&
      this.conta === this.sessao.identidade()?.usuarioId
    );
  }

  private limpar(): number {
    clearTimeout(this.timer);
    this.geracao++;
    this.cursor = '-1';
    this.atual.set(null);
    this.eventos.set([]);
    this.confirmado.set('');
    this.erro.set('');
    this.ocupado.set(false);
    this.exportando.set(false);
    return this.geracao;
  }

  async carregar(): Promise<void> {
    const geracao = this.limpar();
    this.unidades.set([]);
    this.selecionada.set('');
    this.ocupado.set(true);
    this.estado.set('Carregando unidades permitidas…');
    try {
      const dados = await this.sessao.api<{ acoes: string[]; unidades: Unidade[] }>(
        '/api/v1/acessos/efetivos',
      );
      if (!this.vigente(geracao)) return;
      if (!dados.acoes.includes('unidade.acompanhar')) {
        this.estado.set('Sua política não permite acompanhar atualizações.');
        return;
      }
      this.unidades.set(dados.unidades);
      this.estado.set(
        dados.unidades.length
          ? 'Selecione uma unidade para acompanhar.'
          : 'Nenhuma unidade ativa permitida.',
      );
    } catch {
      if (this.vigente(geracao)) {
        this.erro.set('Não foi possível consultar o acesso atual. Tente recarregar as unidades.');
        this.estado.set('Acompanhamento indisponível.');
        this.foco();
      }
    } finally {
      if (this.vigente(geracao)) this.ocupado.set(false);
    }
  }

  selecionar(id: string): void {
    const geracao = this.limpar();
    this.selecionada.set(id);
    if (!id) {
      this.estado.set('Selecione uma unidade para acompanhar.');
      return;
    }
    this.estado.set('Consultando atualizações…');
    void this.consultar(geracao, id);
  }

  selecionarUnidadePopover(id: string, selectEl?: HTMLSelectElement): void {
    this.menuUnidadeAberto.set(false);
    if (selectEl) {
      selectEl.value = id;
      selectEl.focus();
    }
    this.selecionar(id);
  }

  nomeUnidadeSelecionada(): string {
    const id = this.selecionada();
    if (!id) return 'Selecione uma unidade';
    const u = this.unidades().find((x) => x.id === id);
    return u ? u.nome + (u.fuso ? ' (' + u.fuso + ')' : '') : 'Selecione uma unidade';
  }

  formatarDataEvento(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  statusVariante(): 'ok' | 'warn' | 'idle' {
    const st = this.estado();
    if (
      st.includes('Sem conexão') ||
      st.includes('Recuperando') ||
      st.includes('encerrado') ||
      st.includes('indisponível')
    )
      return 'warn';
    if (this.atual() && !this.erro()) return 'ok';
    return 'idle';
  }

  async exportar(): Promise<void> {
    const id = this.selecionada();
    const geracao = this.geracao;
    if (!id || !this.atual() || this.ocupado() || this.exportando() || !this.vigente(geracao))
      return;
    clearTimeout(this.timer);
    this.exportando.set(true);
    this.erro.set('');
    this.estado.set('Consultando para exportar…');
    try {
      // Nunca exportar o cache da tela: ação, sessão e vínculo são revalidados.
      const pagina = await this.sessao.api<Pagina>(
        '/api/v1/operacao/unidades/' + encodeURIComponent(id) + '/eventos?depois=-1',
      );
      if (!this.vigente(geracao) || this.selecionada() !== id) return;
      if (pagina.unidade.id !== id) throw new Error('Unidade divergente.');
      this.baixar(id, pagina.unidade);
      this.estado.set('Arquivo cadastral solicitado ao navegador.');
    } catch (error) {
      if (!this.vigente(geracao)) return;
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status))
        this.encerrarAcompanhamento();
      else {
        this.estado.set('Exportação não concluída.');
        this.erro.set(
          'Não foi possível exportar o cadastro. Nenhum arquivo foi gerado com dados antigos. Tente novamente com conexão.',
        );
        this.foco();
      }
    } finally {
      if (this.vigente(geracao)) {
        this.exportando.set(false);
        this.timer = setTimeout(() => void this.consultar(geracao, id), 5000);
      }
    }
  }

  private baixar(id: string, unidade: Atual): void {
    const arquivo = new Blob(
      [
        JSON.stringify(
          {
            unidade: {
              id: unidade.id,
              nome: unidade.nome,
              fuso: unidade.fuso,
              versao: unidade.versao,
            },
          },
          null,
          2,
        ) + '\n',
      ],
      { type: 'application/json;charset=utf-8' },
    );
    const url = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    try {
      link.href = url;
      link.download = 'unidade-' + id + '.json';
      document.body.append(link);
      link.click();
    } finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  private encerrarAcompanhamento(): void {
    this.limpar();
    this.unidades.set([]);
    this.selecionada.set('');
    this.estado.set('Acompanhamento encerrado.');
    this.erro.set(
      'Acesso à unidade removido ou sessão encerrada. Recarregue as unidades permitidas.',
    );
    this.foco();
  }

  private async consultar(geracao: number, id: string): Promise<void> {
    if (!this.vigente(geracao)) return;
    this.ocupado.set(true);
    let intervalo = 5000;
    let continuar = true;
    try {
      const pagina = await this.sessao.api<Pagina>(
        '/api/v1/operacao/unidades/' +
          encodeURIComponent(id) +
          '/eventos?depois=' +
          encodeURIComponent(this.cursor),
      );
      if (!this.vigente(geracao)) return;
      this.cursor = pagina.proximo;
      this.atual.set(pagina.unidade);
      this.eventos.set([...this.eventos(), ...pagina.eventos].slice(-50));
      this.erro.set('');
      this.confirmado.set(new Date().toLocaleTimeString('pt-BR'));
      this.estado.set(
        pagina.temMais ? 'Recuperando alterações pendentes…' : 'Acompanhamento conectado.',
      );
      if (pagina.temMais) intervalo = 100;
    } catch (error) {
      if (!this.vigente(geracao)) return;
      this.atual.set(null);
      this.eventos.set([]);
      this.confirmado.set('');
      this.cursor = '-1';
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status)) {
        continuar = false;
        this.encerrarAcompanhamento();
      } else {
        this.estado.set('Sem conexão confirmada. Tentando recuperar o acompanhamento…');
      }
    } finally {
      if (this.vigente(geracao)) {
        this.ocupado.set(false);
        if (continuar) this.timer = setTimeout(() => void this.consultar(geracao, id), intervalo);
      }
    }
  }

  private foco(): void {
    setTimeout(() => {
      if (!this.destruido) this.alerta?.nativeElement.focus();
    });
  }
}
