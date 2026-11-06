import { Component, ElementRef, ViewChild, effect, inject, signal } from '@angular/core';
import { ApiFailure } from '../identidade/sessao.service';

import { EmpresaSaas, PlataformaSessaoService } from './plataforma-sessao.service';
import { ProvisionamentoComponent } from './provisionamento.component';

@Component({
  selector: 'app-plataforma',
  imports: [ProvisionamentoComponent],
  styles: [
    `
      :host {
        display: block;
      }
      label {
        display: block;
        margin: 1rem 0 0.35rem;
      }
      input,
      select {
        font: inherit;
        max-width: 100%;
        width: 100%;
        padding: 0.65rem;
        border: 1px solid #627367;
        border-radius: 0.4rem;
        min-height: 48px;
      }
      button {
        margin: 0.5rem 0.5rem 0.5rem 0;
      }
      article {
        border: 1px solid #d4ddd5;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 1rem 0;
        overflow-wrap: anywhere;
      }
      [role='alert'] {
        border-left: 4px solid #a33;
        padding: 0.8rem;
        background: #fff1ed;
      }
      nav {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem;
      }
    `,
  ],
  template: `
    <section aria-labelledby="plataforma-titulo" [attr.aria-busy]="ocupado()">
      <h2 id="plataforma-titulo">Administração SaaS</h2>
      <p>Acesso separado das contas dos restaurantes. Somente metadados de empresas; sem acesso a clientes, pedidos ou pagamentos.</p>
      @if (erro()) {
        <p id="erro-plataforma" role="alert" tabindex="-1" #alerta>{{ erro() }}</p>
      }
      @if (!sessao.autenticado()) {
        <form (submit)="entrar($event, emailInput.value, senhaInput)">
          <label for="saas-email">E-mail do operador</label>
          <input
            #emailInput
            id="saas-email"
            name="email"
            type="email"
            autocomplete="username"
            required
            maxlength="254"
            [disabled]="ocupado() || saidaPendente()"
          >
          <label for="saas-senha">Senha do operador</label>
          <input
            #senhaInput
            id="saas-senha"
            name="senha"
            type="password"
            autocomplete="current-password"
            required
            maxlength="72"
            [disabled]="ocupado() || saidaPendente()"
          >
          <button type="submit" [disabled]="ocupado() || saidaPendente()">Entrar na plataforma</button>
        </form>
        @if (saidaPendente()) {
          <p>A saída no servidor não foi confirmada. Conclua antes de entrar novamente.</p>
          <button (click)="sair()" [disabled]="ocupado()">Tentar encerrar sessão SaaS</button>
        }
      } @else {
        <p>Perfil: OPERADOR_SAAS</p>
        <button (click)="sair()" [disabled]="ocupado()">Sair da plataforma</button>
        <section aria-labelledby="estado-comercial-titulo">
          <h3 id="estado-comercial-titulo">Estado comercial da empresa</h3>
          <p>Suspensão comercial preserva acesso às operações existentes e à reconciliação. Não revoga contas nem permite impersonação. Pedidos ainda não estão implementados.</p>
          <form (submit)="consultar($event, empresaId.value)">
            <label for="saas-empresa-id">Identificador da empresa</label>
            <input
              #empresaId
              id="saas-empresa-id"
              required
              pattern="[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
              [disabled]="ocupado()"
            >
            <button [disabled]="ocupado()">Consultar estado comercial</button>
          </form>
          @if (selecionada(); as empresa) {
            <p data-testid="empresa-estado">{{ empresa.nome }} · {{ empresa.estado }} · versão {{ empresa.versao }}</p>
            @if (empresa.estado === 'ATIVO' || empresa.estado === 'SUSPENSO') {
              <form (submit)="confirmar($event, confirmacaoSenha)">
                <label for="saas-confirmacao">Senha de confirmação do operador</label>
                <input
                  #confirmacaoSenha
                  id="saas-confirmacao"
                  type="password"
                  autocomplete="current-password"
                  required
                  maxlength="72"
                  [attr.aria-describedby]="erro() && senhaInvalida() ? 'erro-plataforma' : null"
                  [attr.aria-invalid]="erro() && senhaInvalida() ? true : null"
                  [disabled]="ocupado()"
                >
                <button [disabled]="ocupado()">Confirmar senha SaaS</button>
              </form>
              <form (submit)="alterar($event, empresa, motivo.value)">
                <p>Próximo estado: {{ empresa.estado === 'ATIVO' ? 'SUSPENSO' : 'ATIVO' }}. Confirme o motivo antes de aplicar.</p>
                <label for="saas-motivo">Motivo da alteração comercial</label>
                <input
                  #motivo
                  id="saas-motivo"
                  required
                  maxlength="240"
                  [disabled]="ocupado() || consultaObrigatoria()"
                >
                <button [disabled]="ocupado() || consultaObrigatoria()">Aplicar estado comercial</button>
              </form>
              @if (consultaObrigatoria()) {
                <p>Consulte novamente pelo identificador antes de outra alteração. Não reenviaremos a escrita automaticamente.</p>
              }
            } @else {
              <p>Empresa incompleta: use o provisionamento assistido. Esta ação não permite ativá-la.</p>
            }
          }
        </section>
        <h3>Empresas cadastradas</h3>
        <button (click)="carregar(pagina())" [disabled]="ocupado()">Atualizar empresas</button>
        <p role="status" aria-live="polite">{{ mensagem() }}</p>
        @for (empresa of empresas(); track empresa.id) {
          <article>
            <h4>{{ empresa.nome }}</h4>
            <p>Estado: {{ empresa.estado }}</p>
            <p>Identificador: {{ empresa.id }}</p>
            <p>Domínios: {{ empresa.dominios.join(', ') || 'Nenhum domínio cadastrado' }}</p>
          </article>
        }
        <nav aria-label="Páginas de empresas">
          <button (click)="carregar(pagina() - 1)" [disabled]="ocupado() || pagina() === 0">Página anterior</button>
          <span>Página {{ pagina() + 1 }}</span>
          <button (click)="carregar(pagina() + 1)" [disabled]="ocupado() || empresas().length < 50">Próxima página</button>
        </nav>
        <app-provisionamento/>
        <p>Não há operação comercial neste ambiente.</p>
      }
    </section>
  `,
})
export class PlataformaComponent {
  readonly sessao = inject(PlataformaSessaoService);
  readonly ocupado = signal(false);
  readonly saidaPendente = signal(false);
  readonly erro = signal('');
  readonly mensagem = signal('');
  readonly empresas = signal<EmpresaSaas[]>([]);
  readonly pagina = signal(0);
  readonly senhaInvalida = signal(false);
  readonly selecionada = signal<EmpresaSaas | null>(null);
  readonly consultaObrigatoria = signal(false);
  private geracao = 0;
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;

  constructor() {
    effect(() => {
      if (!this.sessao.autenticado()) {
        this.geracao++;
        this.empresas.set([]);
        this.pagina.set(0);
        this.selecionada.set(null);
        this.consultaObrigatoria.set(false);
        this.mensagem.set('');
      }
    });
    void this.iniciar();
  }

  private async iniciar(): Promise<void> {
    this.ocupado.set(true);
    try {
      await this.sessao.restaurar();
      if (this.sessao.autenticado()) await this.listar(0);
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async entrar(event: Event, email: string, campoSenha: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado() || this.saidaPendente()) return;
    this.ocupado.set(true);
    this.erro.set('');
    const senha = campoSenha.value;
    campoSenha.value = '';
    try {
      await this.sessao.entrar(email, senha);
      await this.listar(0);
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async sair(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    this.saidaPendente.set(true);
    this.geracao++;
    this.empresas.set([]);
    try {
      await this.sessao.sair();
      this.saidaPendente.set(false);
      setTimeout(() => this.emailInput?.nativeElement.focus());
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async carregar(pagina: number): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      await this.listar(pagina);
    } catch (e) {
      this.mensagem.set('Consulta não atualizada. Os dados anteriores podem estar desatualizados.');
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async consultar(event: Event, id: string): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    const geracao = this.geracao;
    try {
      const empresa = await this.sessao.empresa(id);
      if (geracao === this.geracao && this.sessao.autenticado()) {
        this.selecionada.set(empresa);
        this.empresas.update((lista) => lista.map((e) => (e.id === empresa.id ? empresa : e)));
        this.consultaObrigatoria.set(false);
        this.mensagem.set('Estado comercial consultado. Confira a versão antes de alterar.');
      }
    } catch (e) {
      this.consultaObrigatoria.set(true);
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async confirmar(event: Event, campo: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.erro.set('');
    const senha = campo.value;
    campo.value = '';
    try {
      await this.sessao.reautenticar(senha);
      this.mensagem.set('Senha confirmada por cinco minutos nesta sessão SaaS.');
    } catch (e) {
      this.falhar(e);
    } finally {
      this.ocupado.set(false);
    }
  }

  async alterar(event: Event, empresa: EmpresaSaas, motivo: string): Promise<void> {
    event.preventDefault();
    if (this.ocupado() || this.consultaObrigatoria()) return;
    this.ocupado.set(true);
    this.erro.set('');
    const geracao = this.geracao;
    this.mensagem.set('Alteração comercial em andamento…');
    try {
      const atual = await this.sessao.alterarEstado(
        empresa,
        empresa.estado === 'ATIVO' ? 'SUSPENSO' : 'ATIVO',
        motivo,
      );
      if (geracao !== this.geracao || !this.sessao.autenticado()) return;
      this.selecionada.set(atual);
      this.empresas.update((lista) => lista.map((e) => (e.id === atual.id ? atual : e)));
      this.mensagem.set('Estado comercial atualizado. Acesso empresarial preservado.');
    } catch (e) {
      this.senhaInvalida.set(false);
      this.consultaObrigatoria.set(true);
      this.mensagem.set(
        'Resultado da escrita não reconciliado. Consulte a empresa antes de tentar novamente.',
      );
      this.erro.set(
        (e instanceof Error && !(e instanceof TypeError) ? e.message + ' ' : '') +
          'A alteração pode ter sido aplicada. Consulte o estado pelo identificador; não há reenvio automático.',
      );
      setTimeout(() => this.alerta?.nativeElement.focus());
    } finally {
      this.ocupado.set(false);
    }
  }

  private async listar(pagina: number): Promise<void> {
    const geracao = this.geracao;
    const empresas = await this.sessao.empresas(pagina);
    if (geracao !== this.geracao || !this.sessao.autenticado()) return;
    this.empresas.set(empresas);
    this.pagina.set(pagina);
    this.mensagem.set(empresas.length ? 'Consulta atualizada.' : 'Nenhuma empresa nesta página.');
  }

  private falhar(e: unknown): void {
    this.senhaInvalida.set(
      e instanceof ApiFailure && e.status === 422 && e.codigo === 'CONFIRMACAO_INVALIDA',
    );
    this.erro.set(
      e instanceof TypeError
        ? 'Sem conexão. Nenhuma operação foi confirmada.'
        : e instanceof Error && ['TimeoutError', 'AbortError'].includes(e.name)
          ? 'A resposta não chegou no prazo. Consulte o estado antes de repetir.'
          : e instanceof Error
            ? e.message
            : 'Não foi possível concluir.',
    );
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}
