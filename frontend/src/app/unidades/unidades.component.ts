import { Component, ElementRef, OnInit, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';
import { CriacaoPendenteService } from './criacao-pendente.service';
import { FuncionamentoUnidadeComponent } from './funcionamento.component';

interface Unidade {
  id: string;
  nome: string;
  fuso: string;
  ativa: boolean;
  versao: number;
}

@Component({
  selector: 'app-unidades',
  imports: [HlmButton, FuncionamentoUnidadeComponent],
  template: `
    <section
      class="s6-unidades-section"
      aria-labelledby="unidades-titulo"
      [attr.aria-busy]="ocupado()"
    >
      <div class="s6-talao s6-span-all">
        <div class="s6-head">
          <div class="s6-title-wrap">
            <p class="eyebrow">01 · ESTRUTURA MULTI-UNIDADE</p>
            <h2 id="unidades-titulo">Configurações de unidades</h2>
          </div>
          <div class="s6-head-actions">
            <button
              hlmBtn
              variant="outline"
              type="button"
              (click)="carregar()"
              [disabled]="ocupado()"
            >
              Recarregar unidades
            </button>
          </div>
        </div>
        <p class="s6-note">
          Somente o Administrador configura unidades. Inativar bloqueia novas vendas e remove a unidade da lista pública, preservando o cadastro, os vínculos e a resolução de operações existentes por usuários autorizados.
        </p>
        <p class="s6-note">
          Configure horários e canais em cada unidade. Ajuste os prazos em Prazos de aceite e as regiões de entrega em Regiões e checkout.
        </p>
      </div>

      @if (erro()) {
        <p #alerta id="erro-unidades" role="alert" tabindex="-1" class="erro s6-span-all">
          {{ erro() }}
        </p>
      }
      @if (aviso()) {
        <p aria-live="polite" class="s6-callout s6-span-all">{{ aviso() }}</p>
      }

      @if (pendente()) {
        <div class="s6-amber s6-span-all" role="status">
          <p class="s6-amber-msg">
            Criação pendente de confirmação. Os dados e o identificador foram preservados; reconcilie antes de trocar de seção ou iniciar outro cadastro.
          </p>
          <p class="s6-amber-intent" aria-label="Intenção preservada">
            {{ pendente()?.nome }} · {{ pendente()?.fuso }}
          </p>
          <button
            hlmBtn
            type="button"
            (click)="reconciliar(nome)"
            [disabled]="ocupado()"
          >
            Reconciliar criação
          </button>
        </div>
      }

      <form class="s6-card s6-form-card" (submit)="confirmar($event, senha)">
        <div class="s6-head">
          <h3 class="s6-subhead">Confirmar identidade</h3>
          <span class="s6-badge s6-badge-warn">5 min</span>
        </div>
        <p class="s6-note">Exigido antes de criar ou alterar unidades e horários.</p>
        <div class="s6-field">
          <label for="unidade-senha">Confirme sua senha</label>
          <input
            #senha
            id="unidade-senha"
            type="password"
            autocomplete="current-password"
            required
            maxlength="72"
            [attr.aria-describedby]="senhaInvalida() ? 'erro-unidades' : null"
            [attr.aria-invalid]="senhaInvalida() ? true : null"
            [disabled]="ocupado()"
          />
        </div>
        <button hlmBtn class="s6-btn-full s6-push-bottom" [disabled]="ocupado()">
          Confirmar identidade
        </button>
      </form>

      <form
        class="s6-card s6-form-card"
        data-rascunho="nova-unidade"
        (submit)="criar($event, nome, fuso)"
      >
        <div class="s6-head">
          <h3 class="s6-subhead">Nova unidade</h3>
        </div>
        <p class="s6-note">
          Após falha de conexão, reenvie a mesma intenção ou reconcilie o resultado. Não feche esta página antes da confirmação.
        </p>
        <div class="s6-grid-2-inner">
          <div class="s6-field">
            <label for="nova-unidade-nome">Nome da nova unidade</label>
            <input
              #nome
              id="nova-unidade-nome"
              required
              maxlength="120"
              placeholder="Ex.: Filial Jardins"
              [disabled]="ocupado() || !!pendente()"
            />
          </div>
          <div class="s6-field">
            <label for="nova-unidade-fuso">Fuso da nova unidade</label>
            <input
              #fuso
              id="nova-unidade-fuso"
              required
              maxlength="60"
              value="America/Sao_Paulo"
              aria-describedby="fuso-ajuda"
              (input)="fusoNovo.set(fuso.value)"
              [disabled]="ocupado() || !!pendente()"
            />
          </div>
        </div>
        <small id="fuso-ajuda" class="s6-note">
          Identificador IANA. Exemplos: America/Sao_Paulo, America/Manaus ou UTC.
        </small>
        <div class="s6-filter-pills" role="group" aria-label="Fusos IANA frequentes">
          @for (itemFuso of fusosComuns; track itemFuso) {
            <button
              type="button"
              class="s6-pill-btn"
              [class.active]="fusoNovo() === itemFuso"
              [disabled]="ocupado() || !!pendente()"
              (click)="aplicarFusoNovo(fuso, itemFuso)"
            >
              {{ itemFuso }}
            </button>
          }
        </div>
        <button hlmBtn class="s6-btn-full s6-push-bottom" [disabled]="ocupado()">
          {{ pendente() ? 'Reenviar criação' : 'Criar unidade' }}
        </button>
      </form>

      <div class="s6-card s6-span-all">
        <div class="s6-sec-line">
          <span class="s6-sec-num">02 · UNIDADES CADASTRADAS &amp; FUNCIONAMENTO</span>
          <span class="s6-sec-dotted"></span>
          <span class="s6-badge s6-badge-ok">{{ unidades().length }} na página</span>
        </div>
        <h3 class="s6-subhead">Unidades cadastradas</h3>

        <div class="s6-cards-list">
          @for (u of unidades(); track u.id) {
            <article class="s6-emp-card">
              <div class="s6-emp-head">
                <div class="s6-unit-title-meta">
                  <h4 class="s6-unit-name">{{ u.nome }}</h4>
                  <p class="s6-note">Versão {{ u.versao }} · Fuso: {{ u.fuso }}</p>
                </div>
                <span
                  class="s6-badge"
                  [class.s6-badge-ok]="u.ativa"
                  [class.s6-badge-danger]="!u.ativa"
                >
                  {{ u.ativa ? 'Ativa' : 'Inativa' }}
                </span>
              </div>

              <form
                class="s6-unit-form"
                [attr.data-rascunho]="u.id"
                (submit)="salvar($event, u, nomeEditado.value, fusoEditado.value, ativa.checked)"
              >
                <div class="s6-grid-2-inner">
                  <div class="s6-field">
                    <label [for]="'nome-' + u.id">Nome da unidade</label>
                    <input
                      #nomeEditado
                      [id]="'nome-' + u.id"
                      [value]="u.nome"
                      required
                      maxlength="120"
                      [disabled]="ocupado()"
                    />
                  </div>
                  <div class="s6-field">
                    <label [for]="'fuso-' + u.id">Fuso da unidade</label>
                    <input
                      #fusoEditado
                      [id]="'fuso-' + u.id"
                      [value]="u.fuso"
                      required
                      maxlength="60"
                      [disabled]="ocupado()"
                    />
                  </div>
                </div>
                <div class="s6-filter-pills" role="group" [attr.aria-label]="'Atalhos de fuso de ' + u.nome">
                  @for (itemFuso of fusosComuns; track itemFuso) {
                    <button
                      type="button"
                      class="s6-pill-btn"
                      [disabled]="ocupado()"
                      (click)="aplicarFusoUnidade(fusoEditado, itemFuso)"
                    >
                      {{ itemFuso }}
                    </button>
                  }
                </div>
                <div class="s6-unit-save-row">
                  <label class="s6-tactile-row s6-tactile-center">
                    <input #ativa type="checkbox" [checked]="u.ativa" [disabled]="ocupado()" />
                    <span>Unidade ativa</span>
                  </label>
                  <button hlmBtn [disabled]="ocupado()">Salvar unidade</button>
                </div>
              </form>

              <app-funcionamento-unidade
                [unidadeId]="u.id"
                [nome]="u.nome"
                [bloqueado]="ocupado() || !!pendente()"
                (bloqueio)="bloquearFuncionamento($event)"
                (salvo)="salvo.emit('funcionamento-' + u.id)"
              />
            </article>
          } @empty {
            <p class="bistro-empty">Nenhuma unidade nesta página.</p>
          }
        </div>

        <nav class="s6-pager" aria-label="Páginas de unidades">
          <button
            hlmBtn
            variant="outline"
            type="button"
            (click)="mudarPagina(-1)"
            [disabled]="ocupado() || pagina() === 0"
          >
            Página anterior de unidades
          </button>
          <span>Página {{ pagina() + 1 }}</span>
          <button
            hlmBtn
            variant="outline"
            type="button"
            (click)="mudarPagina(1)"
            [disabled]="ocupado() || unidades().length < 50"
          >
            Próxima página de unidades
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
    .s6-unidades-section {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
      align-items: stretch;
      min-width: 0;
    }
    .s6-span-all {
      grid-column: 1 / -1;
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
    .s6-form-card {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin: 0;
      min-width: 0;
    }
    .s6-push-bottom {
      margin-top: auto;
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
      overflow-wrap: anywhere;
    }
    .s6-amber {
      padding: 0.9rem 1rem;
      border: 1px solid var(--amber-border);
      border-radius: 0.85rem;
      background: var(--amber-bg);
      color: var(--amber-fg);
      display: grid;
      gap: 0.5rem;
      font-size: 0.85rem;
      line-height: 1.48;
    }
    .s6-amber-msg,
    .s6-amber-intent {
      margin: 0;
      overflow-wrap: anywhere;
    }
    .s6-amber-intent {
      font-weight: 750;
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
    .s6-grid-2-inner {
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
    .s6-filter-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.42rem;
    }
    .s6-pill-btn {
      min-height: 48px;
      padding: 0.4rem 0.82rem;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: var(--background);
      color: var(--secondary-foreground);
      font-size: 0.76rem;
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
      gap: 0.85rem;
      min-width: 0;
    }
    .s6-emp-card {
      background: var(--background);
      border: 1px solid var(--border);
      border-radius: 0.95rem;
      padding: 0.95rem;
      display: grid;
      gap: 0.8rem;
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
    .s6-unit-title-meta {
      display: grid;
      gap: 0.18rem;
      min-width: 0;
    }
    .s6-unit-name {
      margin: 0;
      font-size: 1.06rem;
      font-weight: 750;
      color: var(--foreground);
      overflow-wrap: anywhere;
    }
    .s6-unit-form {
      display: grid;
      gap: 0.75rem;
      margin: 0;
      min-width: 0;
    }
    .s6-unit-save-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.7rem;
    }
    .s6-tactile-row {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      min-height: 48px;
      padding: 0.65rem 0.85rem;
      border-radius: 0.8rem;
      border: 1px solid var(--border);
      background: var(--card);
      cursor: pointer;
      margin: 0;
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
    @media (max-width: 760px) {
      .s6-unidades-section {
        grid-template-columns: minmax(0, 1fr);
      }
      .s6-grid-2-inner {
        grid-template-columns: minmax(0, 1fr);
      }
    }
    @media (max-width: 600px) {
      .s6-talao,
      .s6-card {
        padding: 0.95rem;
      }
      .s6-head-actions,
      .s6-head-actions button {
        width: 100%;
      }
      .s6-sec-dotted {
        display: none;
      }
      .s6-unit-save-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
      }
      .s6-pager {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
      }
      .s6-pager span {
        order: -1;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      button[hlmBtn]:not(:disabled):active {
        transform: none;
      }
    }
  `,
})
export class UnidadesComponent implements OnInit {
  private readonly sessao = inject(SessaoService);
  readonly unidades = signal<Unidade[]>([]);
  readonly pagina = signal(0);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly senhaInvalida = signal(false);
  readonly aviso = signal('');
  readonly fusoNovo = signal('America/Sao_Paulo');
  readonly fusosComuns = ['America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'UTC'];
  readonly pendente = inject(CriacaoPendenteService).daConta(this.sessao.identidade()!.usuarioId);
  readonly bloqueio = output<boolean>();
  readonly salvo = output<string>();
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    await this.executar(() => this.listar());
  }

  private async listar(pagina = this.pagina()): Promise<void> {
    const unidades = await this.sessao.api<Unidade[]>(
      '/api/v1/configuracoes/unidades?pagina=' + pagina,
    );
    this.unidades.set(unidades);
    this.pagina.set(pagina);
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

  async criar(event: Event, nome: HTMLInputElement, fuso: HTMLInputElement): Promise<void> {
    event.preventDefault();
    await this.executar(async () => {
      const anterior = this.pendente();
      const intencao = anterior ?? {
        id: crypto.randomUUID(),
        nome: nome.value,
        fuso: fuso.value,
        ativa: true,
      };
      this.pendente.set(intencao);
      try {
        const u = await this.sessao.api<Unidade>(
          '/api/v1/configuracoes/unidades',
          'POST',
          intencao,
        );
        this.confirmarCriacao(u, nome);
      } catch (error) {
        // A rejeição de um retry não prova que a primeira tentativa não confirmou.
        if (!anterior && error instanceof ApiFailure && [400, 403, 422].includes(error.status))
          this.pendente.set(null);
        throw error;
      }
    });
  }

  async salvar(
    event: Event,
    u: Unidade,
    nome: string,
    fuso: string,
    ativa: boolean,
  ): Promise<void> {
    event.preventDefault();
    await this.executar(async () => {
      const atual = await this.sessao.api<Unidade>(
        '/api/v1/configuracoes/unidades/' + u.id,
        'PUT',
        { versao: u.versao, nome, fuso, ativa },
      );
      this.unidades.update((rows) => rows.map((row) => (row.id === u.id ? atual : row)));
      this.aviso.set('Unidade atualizada no servidor.');
      this.salvo.emit(u.id);
    });
  }

  async reconciliar(nome: HTMLInputElement): Promise<void> {
    await this.executar(async () => {
      const intencao = this.pendente();
      if (!intencao) return;
      const u = await this.sessao.api<Unidade>('/api/v1/configuracoes/unidades/' + intencao.id);
      this.confirmarCriacao(u, nome);
    });
  }

  private confirmarCriacao(u: Unidade, nome: HTMLInputElement): void {
    this.pendente.set(null);
    nome.value = '';
    this.unidades.update((rows) => [u, ...rows.filter((row) => row.id !== u.id)].slice(0, 50));
    this.aviso.set('Unidade criada no servidor. Recarregue para ordenar a lista.');
    this.salvo.emit('nova-unidade');
  }

  mudarPagina(delta: number): void {
    void this.executar(() => this.listar(Math.max(0, this.pagina() + delta)));
  }

  bloquearFuncionamento(ocupado: boolean): void {
    this.ocupado.set(ocupado);
    this.bloqueio.emit(ocupado || !!this.pendente());
  }

  aplicarFusoNovo(input: HTMLInputElement, fuso: string): void {
    input.value = fuso;
    this.fusoNovo.set(fuso);
    input.focus();
  }

  aplicarFusoUnidade(input: HTMLInputElement, fuso: string): void {
    input.value = fuso;
    input.focus();
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
      this.bloqueio.emit(!!this.pendente());
    }
  }
}
