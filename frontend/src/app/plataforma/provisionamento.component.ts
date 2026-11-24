import {
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  PlataformaSessaoService,
  PedidoProvisionamento,
  SolicitacaoSaas,
} from './plataforma-sessao.service';
import { ApiFailure } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';

@Component({
  selector: 'app-provisionamento',
  imports: [HlmButton],
  styles: [
    `
      :host {
        display: block;
        margin-top: 1.5rem;
        padding-top: 1.35rem;
        border-top: 2px dashed var(--border, #e5ded3);
      }
      .prov-btn-block {
        width: 100%;
      }
      .prov-btn-primary {
        box-shadow: 0 3px 0 var(--primary-deep, #7f2f20);
      }
      .prov-btn-primary:active:not(:disabled) {
        transform: translateY(1px);
      }
      .prov-intro {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .eyebrow {
        margin: 0 0 0.25rem;
        color: var(--primary-ink, #a53e2b);
        font-size: 0.72rem;
        letter-spacing: 0.12em;
        font-weight: 750;
        text-transform: uppercase;
      }
      .card-title {
        margin: 0 0 0.3rem;
        font-size: 1.08rem;
        font-weight: 750;
        color: var(--foreground, #292521);
      }
      .prov-grid {
        display: grid;
        grid-template-columns: minmax(0, 0.96fr) minmax(0, 1.04fr);
        gap: 1.25rem;
        align-items: start;
      }
      .bistro-card {
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5ded3);
        border-radius: 1rem;
        padding: 1.15rem;
        box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.06));
        min-width: 0;
      }
      .bistro-talao {
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5ded3);
        border-top: 3px solid var(--primary, #a53e2b);
        border-radius: 1rem;
        padding: 1.15rem;
        box-shadow: var(--shadow-soft, 0 1px 2px rgba(41, 37, 33, 0.06));
        min-width: 0;
      }
      .sec-line {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        margin-bottom: 0.75rem;
        flex-wrap: wrap;
      }
      .sec-num {
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--primary-ink, #a53e2b);
      }
      .sec-dotted {
        flex: 1;
        min-width: 1.25rem;
        border-bottom: 1px dotted var(--border, #e5ded3);
      }
      .step-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.4rem;
        margin-bottom: 0.55rem;
      }
      .step-kicker {
        font-size: 0.72rem;
        font-weight: 750;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted-foreground, #6e6259);
      }
      .reauth-form {
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 1px dotted var(--border, #e5ded3);
      }
      .prov-form-grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.75rem;
      }
      .field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        margin-bottom: 0.85rem;
        min-width: 0;
      }
      .field label {
        display: block;
        margin: 0;
        font-size: 0.86rem;
        font-weight: 650;
        color: var(--foreground, #292521);
      }
      .field input {
        width: 100%;
        max-width: 100%;
        min-height: 48px;
        padding: 0.65rem 0.85rem;
        border-radius: 0.65rem;
        border: 1px solid var(--input, #c6b9aa);
        background: var(--card, #ffffff);
        color: var(--foreground, #292521);
        font: inherit;
        font-size: 0.94rem;
      }
      .field input:disabled {
        background: var(--disabled-bg, #efe9e0);
        color: var(--disabled-fg, #594e46);
        border-color: var(--disabled-border, #d8cfc3);
      }
      .hint {
        margin: 0;
        font-size: 0.84rem;
        color: var(--muted-foreground, #6e6259);
        overflow-wrap: anywhere;
      }
      .intencao-box {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.6rem;
        padding: 0.75rem 0.85rem;
        border-radius: 0.75rem;
        background: var(--muted, #f3eee7);
        border: 1px dashed var(--input, #c6b9aa);
        margin-bottom: 0.9rem;
      }
      .intencao-info {
        min-width: 0;
        flex: 1 1 12rem;
      }
      .mono-chip {
        display: inline-block;
        max-width: 100%;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 0.76rem;
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5ded3);
        color: var(--foreground, #292521);
        padding: 0.2rem 0.5rem;
        border-radius: 0.45rem;
        overflow-wrap: anywhere;
      }
      [role='alert'],
      .fail-box {
        border-left: 4px solid var(--destructive, #ad2929);
        background: var(--danger-bg, #fff2f0);
        color: var(--danger-fg, #972626);
        border-radius: 0.6rem;
        padding: 0.8rem 0.95rem;
        margin: 0.75rem 0;
        font-size: 0.88rem;
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .warn-box {
        border-left: 4px solid var(--amber-fg, #684614);
        background: var(--amber-bg, #fff8e8);
        color: var(--amber-fg, #684614);
        border-radius: 0.6rem;
        padding: 0.8rem 0.95rem;
        margin: 0.75rem 0 0;
        font-size: 0.86rem;
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .ok-box {
        border-left: 4px solid var(--accent-foreground, #30523b);
        background: var(--accent, #e8efe7);
        color: var(--accent-foreground, #30523b);
        border-radius: 0.6rem;
        padding: 0.8rem 0.95rem;
        margin: 0.75rem 0 0;
        font-size: 0.86rem;
        font-weight: 600;
        overflow-wrap: anywhere;
      }
      .status-box {
        border: 1px solid var(--border, #e5ded3);
        background: var(--muted, #f3eee7);
        color: var(--foreground, #292521);
        border-radius: 0.65rem;
        padding: 0.65rem 0.85rem;
        margin: 0.65rem 0 1rem;
        font-size: 0.85rem;
      }
      .status-box:empty {
        display: none;
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.24rem 0.62rem;
        border-radius: 999px;
        font-size: 0.74rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        border: 1px solid transparent;
        white-space: nowrap;
      }
      .badge-ok {
        background: var(--accent, #e8efe7);
        color: var(--accent-foreground, #30523b);
        border-color: var(--accent-border, #b7d2be);
      }
      .badge-warn {
        background: var(--amber-bg, #fff8e8);
        color: var(--amber-fg, #684614);
        border-color: var(--amber-border, #e6cf9e);
      }
      .badge-danger {
        background: var(--danger-bg, #fff2f0);
        color: var(--danger-fg, #972626);
        border-color: var(--danger-border, #e8c7c1);
      }
      .badge-info {
        background: var(--info-bg, #edf0f8);
        color: var(--info-fg, #36457d);
        border-color: var(--info-border, #c5cee6);
      }
      .badge-neutral {
        background: var(--secondary, #f0ebe3);
        color: var(--secondary-foreground, #44372e);
        border-color: var(--border, #e5ded3);
      }
      .toolbar-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 0.6rem;
        margin: 0.75rem 0 0.65rem;
      }
      .stack {
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        min-width: 0;
      }
      article.item-card {
        background: var(--card, #ffffff);
        border: 1px solid var(--border, #e5ded3);
        border-radius: 0.9rem;
        padding: 0.95rem;
        margin: 0;
        min-width: 0;
        overflow-wrap: anywhere;
      }
      article.item-card.destaque {
        background: var(--muted, #f3eee7);
        margin-bottom: 1rem;
      }
      .card-head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 0.65rem;
        flex-wrap: wrap;
        margin-bottom: 0.45rem;
      }
      .card-head h4 {
        margin: 0;
        flex: 1 1 0;
        min-width: 0;
        font-size: 1rem;
        font-weight: 750;
        color: var(--foreground, #292521);
        overflow-wrap: anywhere;
      }
      .meta-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 0.45rem;
        font-size: 0.82rem;
        color: var(--muted-foreground, #6e6259);
        overflow-wrap: anywhere;
      }
      .meta-actions {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0.5rem;
        margin-top: 0.65rem;
      }
      .paginacao {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
        align-items: center;
        gap: 0.6rem;
        padding-top: 0.85rem;
        margin-top: 0.85rem;
        border-top: 1px dotted var(--border, #e5ded3);
      }
      .paginacao span {
        font-size: 0.84rem;
        font-weight: 650;
        color: var(--muted-foreground, #6e6259);
        font-variant-numeric: tabular-nums;
        text-align: center;
        padding: 0 0.35rem;
      }
      @media (max-width: 900px) {
        .prov-grid {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 640px) {
        .prov-form-grid-2 {
          grid-template-columns: 1fr;
        }
        .toolbar-row > button,
        .intencao-box > button {
          width: 100%;
        }
        .paginacao {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
        .paginacao > span {
          grid-column: 1 / -1;
          order: -1;
        }
      }
    `,
  ],
  template: `
    <section aria-labelledby="provisionamento-titulo" [attr.aria-busy]="ocupado()">
      <div class="prov-intro">
        <div>
          <p class="eyebrow">03 · PROVISIONAMENTO ASSISTIDO DE RESTAURANTES</p>
          <h3 id="provisionamento-titulo" class="card-title" style="font-size: 1.25rem; margin-bottom: 0.2rem;">
            Provisionar restaurante
          </h3>
          <p class="hint">
            Somente ambiente fictício local. A solicitação não ativa a empresa: o processo privilegiado aplica migrações e cria a unidade e o Administrador. Sem envio real de e-mail.
          </p>
        </div>
        <span class="badge badge-info">Worker assíncrono</span>
      </div>

      @if (erro()) {
        <p id="erro-provisionamento" role="alert" tabindex="-1" #alerta>{{ erro() }}</p>
      }
      <p class="status-box" role="status">{{ mensagem() }}</p>

      <div class="prov-grid">
        <div class="bistro-talao">
          <div class="sec-line">
            <span class="sec-num">NOVA SOLICITAÇÃO</span>
            <span class="sec-dotted"></span>
          </div>

          <form (submit)="confirmar($event, confirmacao)" class="reauth-form">
            <div class="step-head">
              <span class="step-kicker">Passo A · Acesso ao provisionamento</span>
              <span class="badge badge-neutral">Requer senha</span>
            </div>
            <div class="field">
              <label for="prov-confirmacao">Senha do operador para provisionamento</label>
              <input
                #confirmacao
                id="prov-confirmacao"
                type="password"
                autocomplete="current-password"
                required
                maxlength="72"
                [attr.aria-describedby]="erro() && senhaInvalida() ? 'erro-provisionamento' : null"
                [attr.aria-invalid]="erro() && senhaInvalida() ? true : null"
                [disabled]="ocupado()"
              />
            </div>
            <button type="submit" hlmBtn variant="secondary" class="prov-btn-block" [disabled]="ocupado()">
              Confirmar acesso ao provisionamento
            </button>
          </form>

          <div class="intencao-box">
            <div class="intencao-info">
              <span class="hint" style="display: block; font-size: 0.75rem; margin-bottom: 0.2rem;">
                Identificador desta intenção (guarde para consultar depois)
              </span>
              <span class="mono-chip" data-testid="provisionamento-intencao">{{ id() }}</span>
            </div>
            <button type="button" hlmBtn variant="outline" (click)="copiarId(id())">
              Copiar ID
            </button>
          </div>

          <form #cadastro (submit)="solicitar($event, cadastro)">
            <div class="prov-form-grid-2">
              <div class="field">
                <label for="prov-nome">Nome do novo restaurante</label>
                <input
                  id="prov-nome"
                  name="nome"
                  placeholder="Ex.: Cantina da Praça"
                  required
                  maxlength="120"
                  [disabled]="ocupado()"
                />
              </div>
              <div class="field">
                <label for="prov-host">Domínio local do novo restaurante</label>
                <input
                  id="prov-host"
                  name="host"
                  required
                  maxlength="253"
                  placeholder="restaurante.localhost"
                  [disabled]="ocupado()"
                />
              </div>
            </div>
            <div class="prov-form-grid-2">
              <div class="field">
                <label for="prov-unidade">Nome da unidade inicial</label>
                <input
                  id="prov-unidade"
                  name="unidade"
                  placeholder="Ex.: Matriz Centro"
                  required
                  maxlength="120"
                  [disabled]="ocupado()"
                />
              </div>
              <div class="field">
                <label for="prov-email">E-mail do Administrador inicial</label>
                <input
                  id="prov-email"
                  name="email"
                  type="email"
                  autocomplete="off"
                  placeholder="admin@exemplo.localhost"
                  required
                  maxlength="254"
                  [disabled]="ocupado()"
                />
              </div>
            </div>
            <div class="field">
              <label for="prov-senha">Senha inicial do Administrador</label>
              <input
                id="prov-senha"
                name="senha"
                type="password"
                autocomplete="new-password"
                placeholder="Mínimo 12 caracteres"
                required
                minlength="12"
                maxlength="72"
                [disabled]="ocupado()"
              />
              <p class="hint" style="margin-top: 0.25rem;">
                A senha deve ter ao menos doze caracteres e no máximo 72 bytes. Não será exibida no resultado; compartilhe apenas pelo canal privado autorizado.
              </p>
            </div>
            <button
              type="submit"
              hlmBtn
              class="prov-btn-block prov-btn-primary"
              [disabled]="ocupado() || confirmada()"
            >
              {{ pendente() ? 'Reenviar mesma intenção' : 'Solicitar provisionamento' }}
            </button>
          </form>

          @if (pendente()) {
            <p class="warn-box">
              Resultado pendente. Consulte o identificador ou reenvie os mesmos dados e a mesma senha. Não gere outra intenção para o mesmo restaurante. Ao sair, somente o identificador fica em memória desta conta; recarregar perde esse rascunho.
            </p>
          }

          @if (confirmada()) {
            <div class="ok-box">
              <p style="margin: 0 0 0.75rem;">
                Solicitação registrada. Aguarde o processamento e acompanhe ao lado.
              </p>
              <button
                type="button"
                hlmBtn
                variant="outline"
                class="prov-btn-block"
                (click)="nova(cadastro)"
                [disabled]="ocupado()"
              >
                Preparar outro restaurante
              </button>
            </div>
          }
        </div>

        <div class="bistro-card">
          <div class="sec-line">
            <span class="sec-num">04 · CONSULTA E ACOMPANHAMENTO</span>
            <span class="sec-dotted"></span>
          </div>

          <form (submit)="consultar($event, consultaId.value)" style="margin-bottom: 1rem;">
            <div class="field">
              <label for="prov-id">Identificador da solicitação</label>
              <input
                #consultaId
                id="prov-id"
                [value]="id()"
                required
                pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                [disabled]="ocupado()"
              />
            </div>
            <button type="submit" hlmBtn variant="outline" class="prov-btn-block" [disabled]="ocupado()">
              Consultar provisionamento
            </button>
          </form>

          @if (selecionada(); as pedido) {
            <article class="item-card destaque" data-testid="provisionamento-detalhe">
              <div class="card-head">
                <h4>{{ pedido.nome }}</h4>
                <span
                  class="badge"
                  [class.badge-ok]="pedido.estado === 'CONCLUIDO'"
                  [class.badge-danger]="pedido.estado === 'FALHOU'"
                  [class.badge-warn]="pedido.estado !== 'CONCLUIDO' && pedido.estado !== 'FALHOU'"
                >
                  {{ pedido.estado }}
                </span>
              </div>
              <div class="meta-row" style="margin-bottom: 0.4rem;">
                <span class="mono-chip" [title]="pedido.id">
                  <span class="sr-only">{{ pedido.id }}</span>{{ idCurto(pedido.id) }}
                </span>
                <span>{{ pedido.host }}</span>
              </div>
              <p class="hint">Resultado: {{ pedido.estado }} · versão {{ pedido.versao }}</p>
              @if (pedido.ultimaFalha) {
                <p class="fail-box">
                  Falha técnica: {{ pedido.ultimaFalha }}. Corrija a causa antes de solicitar retomada.
                </p>
              }
              @if (pedido.estado === 'FALHOU') {
                <button
                  type="button"
                  hlmBtn
                  class="prov-btn-block prov-btn-primary"
                  style="margin-top: 0.7rem;"
                  (click)="retomar(pedido)"
                  [disabled]="ocupado() || reconsultar()"
                >
                  Solicitar retomada
                </button>
              }
              @if (pedido.estado === 'CONCLUIDO') {
                <p class="ok-box">
                  Provisionamento concluído. Consulte o estado comercial atual na seção de empresas; não há login automático nem impersonação.
                </p>
              }
              @if (reconsultar()) {
                <p class="warn-box">
                  Consulte novamente antes de outra retomada. A resposta pode ter sido perdida.
                </p>
              }
            </article>
          }

          <div class="toolbar-row">
            <strong style="font-size: 0.95rem;">Solicitações recentes</strong>
            <button type="button" hlmBtn variant="outline" (click)="listar(pagina())" [disabled]="ocupado()">
              Atualizar solicitações
            </button>
          </div>

          <div class="stack">
            @for (pedido of pedidos(); track pedido.id) {
              <article class="item-card">
                <div class="card-head">
                  <h4>{{ pedido.nome }}</h4>
                  <span
                    class="badge"
                    [class.badge-ok]="pedido.estado === 'CONCLUIDO'"
                    [class.badge-danger]="pedido.estado === 'FALHOU'"
                    [class.badge-warn]="pedido.estado !== 'CONCLUIDO' && pedido.estado !== 'FALHOU'"
                  >
                    {{ pedido.estado }}
                  </span>
                </div>
                <div class="meta-row">
                  <span class="mono-chip" [title]="pedido.id">
                    <span class="sr-only">{{ pedido.id }}</span>{{ idCurto(pedido.id) }}
                  </span>
                  <span>{{ pedido.host }}</span>
                </div>
                <div class="meta-actions">
                  <button type="button" hlmBtn variant="outline" (click)="copiarId(pedido.id)">
                    Copiar ID
                  </button>
                  <button type="button" hlmBtn variant="outline" (click)="verDetalhe(pedido, consultaId)">
                    Consultar
                  </button>
                </div>
              </article>
            } @empty {
              <p class="hint">Nenhuma solicitação carregada nesta página.</p>
            }
          </div>

          <nav class="paginacao" aria-label="Páginas de provisionamentos">
            <button
              type="button"
              hlmBtn
              variant="outline"
              (click)="listar(pagina() - 1)"
              [disabled]="ocupado() || pagina() === 0"
            >
              Solicitações anteriores
            </button>
            <span>Página {{ pagina() + 1 }}</span>
            <button
              type="button"
              hlmBtn
              variant="outline"
              (click)="listar(pagina() + 1)"
              [disabled]="ocupado() || pedidos().length < 50"
            >
              Mais solicitações
            </button>
          </nav>
        </div>
      </div>
    </section>
  `,
})
export class ProvisionamentoComponent {
  readonly sessao = inject(PlataformaSessaoService);
  readonly id = signal(this.sessao.intencaoProvisionamento() || crypto.randomUUID());
  readonly pendente = signal(!!this.sessao.intencaoProvisionamento());
  readonly confirmada = signal(false);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly mensagem = signal('');
  readonly reconsultar = signal(false);
  readonly senhaInvalida = signal(false);
  readonly selecionada = signal<SolicitacaoSaas | null>(null);
  readonly pedidos = signal<SolicitacaoSaas[]>([]);
  readonly pagina = signal(0);
  private readonly ator = this.sessao.usuarioId();
  private destruido = false;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
    });
  }

  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  @HostListener('window:beforeunload', ['$event']) avisar(event: BeforeUnloadEvent): void {
    if (this.pendente()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  private atual(): boolean {
    return !this.destruido && this.sessao.autenticado() && this.sessao.usuarioId() === this.ator;
  }

  private falhar(error: unknown, incerto = false): void {
    if (!this.atual()) return;
    this.senhaInvalida.set(
      error instanceof ApiFailure &&
        error.status === 422 &&
        error.codigo === 'CONFIRMACAO_INVALIDA',
    );
    const texto =
      error instanceof TypeError
        ? 'Sem conexão.'
        : error instanceof Error && ['AbortError', 'TimeoutError'].includes(error.name)
          ? 'Resposta não recebida no prazo.'
          : error instanceof Error
            ? error.message
            : 'Não foi possível concluir.';
    this.erro.set(
      texto +
        (incerto
          ? ' A escrita pode ter sido aplicada. Consulte pelo identificador antes de repetir.'
          : ''),
    );
    setTimeout(() => this.alerta?.nativeElement.focus());
  }

  async confirmar(event: Event, input: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    const senha = input.value;
    input.value = '';
    this.ocupado.set(true);
    this.erro.set('');
    try {
      await this.sessao.reautenticar(senha);
      if (this.atual())
        this.mensagem.set('Acesso ao provisionamento confirmado por cinco minutos.');
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async solicitar(event: Event, form: HTMLFormElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado() || this.confirmada()) return;
    const dados = new FormData(form);
    const pedido: PedidoProvisionamento = {
      id: this.id(),
      nome: String(dados.get('nome')),
      host: String(dados.get('host')),
      unidade: String(dados.get('unidade')),
      email: String(dados.get('email')),
      senha: String(dados.get('senha')),
    };
    (form.elements.namedItem('senha') as HTMLInputElement).value = '';
    this.sessao.guardarIntencao(pedido.id);
    this.pendente.set(true);
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const resultado = await this.sessao.solicitarProvisionamento(pedido);
      if (this.atual()) {
        this.receber(resultado);
        this.mensagem.set(
          'Solicitação registrada. Aguarde processamento e consulte o resultado; a empresa ainda não foi ativada por esta resposta.',
        );
      }
    } catch (e) {
      this.falhar(e, true);
    } finally {
      pedido.senha = '';
      this.ocupado.set(false);
    }
  }

  private receber(pedido: SolicitacaoSaas): void {
    this.selecionada.set(pedido);
    this.reconsultar.set(false);
    this.pedidos.update((lista) => lista.map((p) => (p.id === pedido.id ? pedido : p)));
    if (pedido.id === this.id()) {
      this.sessao.limparIntencao(pedido.id);
      this.pendente.set(false);
      this.confirmada.set(true);
    }
  }

  async consultar(event: Event, id: string): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const pedido = await this.sessao.consultarProvisionamento(id);
      if (this.atual()) {
        this.receber(pedido);
        this.mensagem.set('Resultado do provisionamento consultado.');
      }
    } catch (e) {
      this.reconsultar.set(true);
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async retomar(pedido: SolicitacaoSaas): Promise<void> {
    if (this.ocupado() || this.reconsultar()) return;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const resultado = await this.sessao.retomarProvisionamento(pedido);
      if (this.atual()) {
        this.receber(resultado);
        this.mensagem.set(
          'Retomada solicitada. Aguarde processamento; não significa empresa ativa.',
        );
      }
    } catch (e) {
      this.reconsultar.set(true);
      this.falhar(e, true);
    } finally {
      this.ocupado.set(false);
    }
  }

  async listar(pagina: number): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const lista = await this.sessao.provisionamentos(pagina);
      if (this.atual()) {
        this.pedidos.set(lista);
        this.pagina.set(pagina);
        this.mensagem.set(
          lista.length ? 'Solicitações atualizadas.' : 'Nenhuma solicitação nesta página.',
        );
      }
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  nova(form: HTMLFormElement): void {
    if (this.ocupado() || !this.confirmada()) return;
    form.reset();
    this.id.set(crypto.randomUUID());
    this.confirmada.set(false);
    this.selecionada.set(null);
    this.erro.set('');
    this.mensagem.set('Nova intenção preparada.');
  }

  idCurto(id: string): string {
    return '#' + id.slice(0, 8) + '…' + id.slice(-4);
  }

  copiarId(id: string): void {
    try {
      void navigator.clipboard?.writeText(id);
    } catch {
      /* Clipboard indisponível em contexto restrito. */
    }
    this.mensagem.set('Identificador copiado: ' + this.idCurto(id));
  }

  verDetalhe(pedido: SolicitacaoSaas, input: HTMLInputElement): void {
    input.value = pedido.id;
    void this.consultar(new Event('submit'), pedido.id);
  }
}
