import { Component, ElementRef, OnInit, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormularioRotaDirective } from '../rotas/formulario-rota.directive';
import { focarEditor, restaurarFoco } from '../ui/foco-gestao';
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
  criadoEm: string;
  aceitoEm: string | null;
  revogadoEm: string | null;
}

@Component({
  selector: 'app-convites',
  imports: [DatePipe, NgTemplateOutlet],
  template: `
    <section aria-labelledby="convites-titulo" [attr.aria-busy]="ocupado()">
      <div class="gestao-toolbar">
        <h2 id="convites-titulo">Convites de funcionários</h2>
        <div class="gestao-acoes">
          <button #novo type="button" (click)="abrir(novo)" [disabled]="ocupado() || !!pendente()"
            [attr.aria-expanded]="editorAberto() || !!pendente()">Novo convite</button>
          <button type="button" data-variant="outline" (click)="carregar(pagina())" [disabled]="ocupado()">Recarregar convites</button>
        </div>
      </div>
      <form class="gestao-toolbar confirmacao" (submit)="reautenticar($event, senha)">
        <div>
          <label for="senha-convite-admin">Confirme sua senha para convidar</label>
          <input #senha id="senha-convite-admin" type="password" autocomplete="current-password" required maxlength="72"
            [attr.aria-describedby]="senhaInvalida() ? 'erro-convites-admin' : null"
            [attr.aria-invalid]="senhaInvalida() ? true : null" [disabled]="ocupado()">
        </div>
        <button data-variant="outline" [disabled]="ocupado()">Confirmar identidade para convites</button>
      </form>
      @if (erro()) {
        <p #alerta id="erro-convites-admin" role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p role="status">{{ aviso() }}</p>
      }
      @if (editorAberto() || pendente()) {
        <section class="gestao-editor" aria-labelledby="novo-convite-titulo">
          <h3 id="novo-convite-titulo" tabindex="-1" data-gestao-foco>Novo convite</h3>
          @if (pendente(); as p) {
            <p role="status">Convite com resultado pendente: {{ p.id }} · {{ p.email }}. Não crie outra intenção. Fechar ou recarregar esta página perde o rascunho; consulte este identificador ao retornar.</p>
            <div class="gestao-acoes">
              <button type="button" (click)="enviar()" [disabled]="ocupado()">Reenviar mesma intenção</button>
              <button type="button" data-variant="outline" (click)="consultar(p.id)" [disabled]="ocupado()">Conferir intenção pendente</button>
            </div>
          }
          <div [hidden]="!!pendente()">
            <p>O destinatário precisa usar um e-mail sem cadastro, confirmar o endereço e definir a própria senha. O convite vale por quinze minutos.</p>
            <p>Ambiente fictício: captura privada, sem envio real de e-mail.</p>
            <form data-rascunho="convite" (submit)="criar($event, email.value)">
              <div class="gestao-campos">
                <div>
                  <label for="email-convite">E-mail do funcionário convidado</label>
                  <input #email id="email-convite" type="email" required maxlength="254" autocomplete="off"
                    [value]="emailRascunho()" (input)="emailRascunho.set(email.value)" [disabled]="ocupado()"
                    [attr.aria-invalid]="emailInvalido() ? true : null"
                    [attr.aria-describedby]="emailInvalido() ? 'erro-convites-admin' : null">
                </div>
                <div>
                  <label for="perfil-convite">Perfil do convite</label>
                  <select id="perfil-convite" [value]="perfil()"
                    (change)="perfil.set($any($event.target).value); vinculos.set([])" [disabled]="ocupado()">
                    @for (p of perfis; track p) {
                      <option [value]="p" [selected]="perfil() === p">{{ p }}</option>
                    }
                  </select>
                </div>
              </div>
              @if (perfil() !== 'ADMINISTRADOR') {
                <fieldset [disabled]="ocupado()">
                  <legend>Unidades do convite</legend>
                  <p>Sem vínculos, o funcionário não acessa unidades.</p>
                  @for (u of unidades(); track u.id) {
                    <label class="gestao-opcao"><input type="checkbox" [checked]="vinculos().includes(u.id)"
                      (change)="vincular(u.id, $any($event.target).checked)">{{ u.nome }}</label>
                  }
                </fieldset>
              } @else {
                <p>Administrador cobre todas as unidades.</p>
              }
              <div class="gestao-acoes">
                <button [disabled]="ocupado() || !carregado()">Criar convite</button>
                <button type="button" data-variant="ghost" (click)="cancelar(novo)" [disabled]="ocupado()">Cancelar</button>
              </div>
            </form>
          </div>
        </section>
      }
      <form class="gestao-toolbar confirmacao" (submit)="buscar($event, id.value)" data-sem-rascunho>
        <div>
          <label for="id-convite">Identificador do convite</label>
          <input #id id="id-convite" required [disabled]="ocupado()"
            [attr.aria-invalid]="identificadorInvalido() ? true : null"
            [attr.aria-describedby]="identificadorInvalido() ? 'erro-convites-admin' : null">
        </div>
        <button data-variant="outline" [disabled]="ocupado()">Consultar convite</button>
      </form>
      @if (encontrado(); as c) {
        <ng-container [ngTemplateOutlet]="dadosConvite" [ngTemplateOutletContext]="{ $implicit: c }"/>
        <p class="consulta-resultado" role="status">{{ c.id }} · {{ c.email }} · {{ c.perfil }} · {{ c.estado }}</p>
      }
      <ng-template #dadosConvite let-c><details class="detalhes-convite"><summary>Dados do convite</summary>
              <p>Unidades: {{ nomesUnidades(c) }}</p>
              <p>Criado em {{ c.criadoEm | date: 'dd/MM/yyyy HH:mm' }} · Validade até {{ c.expiraEm | date: 'dd/MM/yyyy HH:mm' }}</p>
              @if (c.aceitoEm) { <p>Aceito em {{ c.aceitoEm | date: 'dd/MM/yyyy HH:mm' }}</p> }
              @if (c.revogadoEm) { <p>Revogado em {{ c.revogadoEm | date: 'dd/MM/yyyy HH:mm' }}</p> }
            </details></ng-template>
      <div class="gestao-lista">
        @for (c of lista(); track c.id) {
          <article class="gestao-linha">
            <div>
              <h3>{{ c.email }}</h3>
              <span>{{ c.perfil }}</span>
            </div>
            <span class="gestao-estado" [attr.data-estado]="c.estado">{{ c.estado }}</span>
            <span class="validade">Expira em <time [attr.datetime]="c.expiraEm">{{ c.expiraEm | date: 'dd/MM/yyyy HH:mm' }}</time></span>
            <ng-container [ngTemplateOutlet]="dadosConvite" [ngTemplateOutletContext]="{ $implicit: c }"/>
            @if (c.estado === 'PENDENTE') {
              <button type="button" data-variant="outline" [attr.aria-label]="'Revogar convite de ' + c.email"
                (click)="revogar(c.id)" [disabled]="ocupado()">Revogar</button>
            }
          </article>
        } @empty {
          <p class="vazio">Nenhum convite nesta página.</p>
        }
      </div>
      <nav class="gestao-acoes" aria-label="Páginas de convites">
        <button data-variant="outline" (click)="carregar(pagina() - 1)" [disabled]="ocupado() || pagina() === 0">Convites anteriores</button>
        <span>Página {{ pagina() + 1 }}</span>
        <button data-variant="outline" (click)="carregar(pagina() + 1)" [disabled]="ocupado() || lista().length < 50">Próximos convites</button>
      </nav>
    </section>
  `,
  styles: `
    :host { display: block; }
    .confirmacao { justify-content: start; align-items: end; }
    .gestao-linha h3 { margin: 0; }
    .gestao-lista + nav { margin-top: var(--gestao-espaco-3, 12px); }
    .consulta-resultado { overflow-wrap: anywhere; }
  `,
})
export class ConvitesComponent implements OnInit {
  private readonly sessao = inject(SessaoService);
  private readonly formulario = inject(FormularioRotaDirective, { optional: true });
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  readonly editorAberto = signal(false);
  readonly emailRascunho = signal('');
  readonly emailInvalido = signal(false);
  readonly identificadorInvalido = signal(false);
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
  readonly bloqueio = output<boolean>();
  readonly salvo = output<string>();
  readonly senhaInvalida = signal(false);
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('novo') novo?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    void this.carregar(0);
  }

  abrir(origem: HTMLElement): void {
    if (this.ocupado() || this.pendente()) return;
    if (this.editorAberto()) {
      this.cancelar(origem);
      return;
    }
    this.editorAberto.set(true);
    focarEditor(this.host);
  }

  cancelar(origem: HTMLElement): void {
    if (
      this.ocupado() ||
      this.pendente() ||
      this.formulario?.confirmarDescarte('convite') === false
    )
      return;
    this.erro.set('');
    this.aviso.set('');
    this.emailInvalido.set(false);
    this.identificadorInvalido.set(false);
    this.senhaInvalida.set(false);
    this.fechar(origem);
  }

  private fechar(origem = this.novo?.nativeElement): void {
    this.editorAberto.set(false);
    this.emailRascunho.set('');
    this.perfil.set(this.perfis[0]);
    this.vinculos.set([]);
    restaurarFoco(origem);
  }

  vincular(id: string, ativo: boolean): void {
    this.vinculos.update((v) => (ativo ? [...new Set([...v, id])] : v.filter((x) => x !== id)));
  }

  nomesUnidades(convite: Convite): string {
    if (convite.perfil === 'ADMINISTRADOR') return 'Todas as unidades';
    return (
      convite.unidades
        .map(
          (id) => this.unidades().find((u) => u.id === id)?.nome ?? 'Unidade fora da lista ativa',
        )
        .join(', ') || 'Nenhuma unidade'
    );
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
        if (this.pagina() === 0)
          this.lista.update((lista) =>
            [c, ...lista.filter((item) => item.id !== c.id)].slice(0, 50),
          );
        this.fechar();
        this.aviso.set(
          'Convite registrado no servidor: ' +
            c.id +
            ' · ' +
            c.estado +
            '. Confira a captura privada.',
        );
      } catch (error) {
        if (error instanceof ApiFailure && error.status < 500 && !p.incerta) {
          this.pendente.set(null);
          this.emailInvalido.set(error.status === 409 && error.message.startsWith('Este endereço'));
          this.editorAberto.set(true);
        } else {
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
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
        this.identificadorInvalido.set(true);
        throw new Error('Informe um identificador UUID válido.');
      }
      const c = await this.sessao.api<Convite>('/api/v1/equipe/convites/' + id);
      this.encontrado.set(c);
      if (this.pendente()?.id === c.id) {
        this.pendente.set(null);
        this.salvo.emit('convite');
        this.fechar();
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
    this.emailInvalido.set(false);
    this.identificadorInvalido.set(false);
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
