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

@Component({
  selector: 'app-provisionamento',
  styles: [
    `
      :host {
        display: block;
        border: 1px solid #d4ddd5;
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 1rem 0;
      }
      label {
        display: block;
        margin: 0.8rem 0 0.3rem;
      }
      input {
        display: block;
        width: 100%;
        max-width: 100%;
        min-height: 48px;
        padding: 0.6rem;
        font: inherit;
        border: 1px solid #627367;
        border-radius: 0.4rem;
      }
      button {
        margin: 0.5rem 0.5rem 0.5rem 0;
      }
      article {
        overflow-wrap: anywhere;
        margin: 1rem 0;
        padding: 0.6rem;
        border: 1px solid #d4ddd5;
      }
      p {
        overflow-wrap: anywhere;
      }
      [role='alert'] {
        background: #fff1ed;
        border-left: 4px solid #a33;
        padding: 0.8rem;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        align-items: center;
      }
    `,
  ],
  template: `
    <section aria-labelledby="provisionamento-titulo" [attr.aria-busy]="ocupado()">
      <h3 id="provisionamento-titulo">Provisionar restaurante</h3>
      <p>Somente ambiente fictício local. A solicitação não ativa a empresa: o processo privilegiado aplica migrações e cria a unidade e o Administrador. Sem envio real de e-mail.</p>
      @if (erro()) {
        <p id="erro-provisionamento" role="alert" tabindex="-1" #alerta>{{ erro() }}</p>
      }
      <p role="status">{{ mensagem() }}</p>
      <form (submit)="confirmar($event, confirmacao)">
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
        >
        <button [disabled]="ocupado()">Confirmar acesso ao provisionamento</button>
      </form>
      <form #cadastro (submit)="solicitar($event, cadastro)">
        <p>Identificador desta intenção: <span data-testid="provisionamento-intencao">{{ id() }}</span>. Guarde-o para consultar depois de fechar a página.</p>
        <label for="prov-nome">Nome do novo restaurante</label>
        <input id="prov-nome" name="nome" required maxlength="120" [disabled]="ocupado()">
        <label for="prov-host">Domínio local do novo restaurante</label>
        <input
          id="prov-host"
          name="host"
          required
          maxlength="253"
          placeholder="restaurante.localhost"
          [disabled]="ocupado()"
        >
        <label for="prov-unidade">Nome da unidade inicial</label>
        <input id="prov-unidade" name="unidade" required maxlength="120" [disabled]="ocupado()">
        <label for="prov-email">E-mail do Administrador inicial</label>
        <input
          id="prov-email"
          name="email"
          type="email"
          autocomplete="off"
          required
          maxlength="254"
          [disabled]="ocupado()"
        >
        <label for="prov-senha">Senha inicial do Administrador</label>
        <input
          id="prov-senha"
          name="senha"
          type="password"
          autocomplete="new-password"
          required
          minlength="12"
          maxlength="72"
          [disabled]="ocupado()"
        >
        <p>A senha deve ter ao menos doze caracteres e no máximo 72 bytes. Não será exibida no resultado; compartilhe apenas pelo canal privado autorizado.</p>
        <button [disabled]="ocupado() || confirmada()">{{ pendente() ? 'Reenviar mesma intenção' : 'Solicitar provisionamento' }}</button>
      </form>
      @if (pendente()) {
        <p>Resultado pendente. Consulte o identificador ou reenvie os mesmos dados e a mesma senha. Não gere outra intenção para o mesmo restaurante. Ao sair, somente o identificador fica em memória desta conta; recarregar perde esse rascunho.</p>
      }
      @if (confirmada()) {
        <button (click)="nova(cadastro)" [disabled]="ocupado()">Preparar outro restaurante</button>
      }
      <form (submit)="consultar($event, consultaId.value)">
        <label for="prov-id">Identificador da solicitação</label>
        <input
          #consultaId
          id="prov-id"
          [value]="id()"
          required
          pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
          [disabled]="ocupado()"
        >
        <button [disabled]="ocupado()">Consultar provisionamento</button>
      </form>
      @if (selecionada(); as pedido) {
        <article data-testid="provisionamento-detalhe">
          <h4>{{ pedido.nome }}</h4>
          <p>{{ pedido.id }} · {{ pedido.host }}</p>
          <p>Resultado: {{ pedido.estado }} · versão {{ pedido.versao }}</p>
          @if (pedido.ultimaFalha) {
            <p>Falha técnica: {{ pedido.ultimaFalha }}. Corrija a causa antes de solicitar retomada.</p>
          }
          @if (pedido.estado === 'FALHOU') {
            <button (click)="retomar(pedido)" [disabled]="ocupado() || reconsultar()">Solicitar retomada</button>
          }
          @if (pedido.estado === 'CONCLUIDO') {
            <p>Provisionamento concluído. Consulte o estado comercial atual na seção de empresas; não há login automático nem impersonação.</p>
          }
          @if (reconsultar()) {
            <p>Consulte novamente antes de outra retomada. A resposta pode ter sido perdida.</p>
          }
        </article>
      }
      <button (click)="listar(pagina())" [disabled]="ocupado()">Atualizar solicitações</button>
      @for (pedido of pedidos(); track pedido.id) {
        <article>
          <p>{{ pedido.nome }} · {{ pedido.estado }}</p>
          <p>{{ pedido.id }} · {{ pedido.host }}</p>
        </article>
      }
      <nav aria-label="Páginas de provisionamentos">
        <button (click)="listar(pagina() - 1)" [disabled]="ocupado() || pagina() === 0">Solicitações anteriores</button>
        <span>Página {{ pagina() + 1 }}</span>
        <button (click)="listar(pagina() + 1)" [disabled]="ocupado() || pedidos().length < 50">Mais solicitações</button>
      </nav>
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
}
