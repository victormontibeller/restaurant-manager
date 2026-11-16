import { Component, ElementRef, OnInit, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { FormularioRotaDirective } from '../rotas/formulario-rota.directive';
import { focarEditor, restaurarFoco } from '../ui/foco-gestao';
import { CriacaoPendenteService } from './criacao-pendente.service';
import { FuncionamentoUnidadeComponent } from './funcionamento.component';

interface Unidade {
  id: string;
  nome: string;
  fuso: string;
  ativa: boolean;
  versao: number;
}

type EditorUnidade = { tipo: 'novo' } | { tipo: 'dados' | 'horarios'; id: string };

@Component({
  selector: 'app-unidades',
  imports: [FuncionamentoUnidadeComponent],
  template: `
    <section aria-labelledby="unidades-titulo" [attr.aria-busy]="ocupado()">
      <div class="gestao-toolbar">
        <h2 id="unidades-titulo">Configurações de unidades</h2>
        <div class="gestao-acoes">
          <button #nova type="button" (click)="abrir({ tipo: 'novo' }, nova)"
            [disabled]="ocupado() || !!pendente()" [attr.aria-expanded]="criando()">
            Nova unidade
          </button>
          <button type="button" data-variant="outline" (click)="carregar()" [disabled]="ocupado()">
            Recarregar unidades
          </button>
        </div>
      </div>
      <p>Configure horários e canais em cada unidade. Ajuste os prazos em Prazos de aceite e as regiões de entrega em Regiões e checkout.</p>
      <form class="gestao-toolbar confirmacao" (submit)="confirmar($event, senha)">
        <div>
          <label for="unidade-senha">Confirme sua senha</label>
          <input
            #senha id="unidade-senha" type="password" autocomplete="current-password" required maxlength="72"
            [attr.aria-describedby]="senhaInvalida() ? 'erro-unidades' : null"
            [attr.aria-invalid]="senhaInvalida() ? true : null"
            [disabled]="ocupado()"
          >
        </div>
        <button data-variant="outline" [disabled]="ocupado()">Confirmar identidade</button>
      </form>
      @if (erro()) {
        <p #alerta id="erro-unidades" role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p role="status">{{ aviso() }}</p>
      }
      @if (criando()) {
        <section class="gestao-editor" aria-labelledby="titulo-nova-unidade">
          <h3 id="titulo-nova-unidade" tabindex="-1" data-gestao-foco>Nova unidade</h3>
          @if (pendente()) {
            <p role="status">Criação pendente de confirmação. Confira o resultado ou reenvie a mesma intenção.</p>
            <p aria-label="Intenção preservada">{{ pendente()?.nome }} · {{ pendente()?.fuso }}</p>
          }
          <form data-rascunho="nova-unidade" (submit)="criar($event, nome, fuso)">
            <div class="gestao-campos">
              <div>
                <label for="nova-unidade-nome">Nome da nova unidade</label>
                <input #nome id="nova-unidade-nome" required maxlength="120" [disabled]="ocupado() || !!pendente()">
              </div>
              <div>
                <label for="nova-unidade-fuso">Fuso da nova unidade</label>
                <input #fuso id="nova-unidade-fuso" required maxlength="60" value="America/Sao_Paulo"
                  [attr.aria-describedby]="fusoInvalido() ? 'fuso-ajuda erro-unidades' : 'fuso-ajuda'"
                  [attr.aria-invalid]="fusoInvalido() ? true : null"
                  [disabled]="ocupado() || !!pendente()">
                <small id="fuso-ajuda">Identificador IANA, como America/Sao_Paulo ou UTC.</small>
              </div>
            </div>
            <div class="gestao-acoes">
              <button [disabled]="ocupado()">{{ pendente() ? 'Reenviar criação' : 'Criar unidade' }}</button>
              @if (pendente()) {
                <button type="button" data-variant="outline" (click)="reconciliar(nome)" [disabled]="ocupado()">
                  Reconciliar criação
                </button>
              } @else {
                <button type="button" data-variant="ghost" (click)="cancelar(nova)" [disabled]="ocupado()">
                  Cancelar
                </button>
              }
            </div>
          </form>
        </section>
      }
      <div class="gestao-lista">
        @for (u of unidades(); track u.id) {
          <article>
            <header class="gestao-linha">
              <div>
                <h3>{{ u.nome }}</h3>
                <span>{{ u.fuso }}</span>
              </div>
              <span class="gestao-estado" [attr.data-estado]="u.ativa ? 'ativo' : 'inativo'">
                {{ u.ativa ? 'Ativa' : 'Inativa' }}
              </span>
              <div class="gestao-acoes">
                <button #editar type="button" data-variant="outline"
                  (click)="abrir({ tipo: 'dados', id: u.id }, editar)"
                  [disabled]="ocupado() || !!pendente()"
                  [attr.aria-expanded]="editorDaUnidade('dados', u.id)">
                  Editar unidade
                </button>
                <button #horarios type="button" data-variant="ghost"
                  (click)="abrir({ tipo: 'horarios', id: u.id }, horarios)"
                  [disabled]="ocupado() || !!pendente()"
                  [attr.aria-expanded]="editorDaUnidade('horarios', u.id)">
                  Configurar horários e canais
                </button>
              </div>
            </header>
            @if (editorDaUnidade('dados', u.id)) {
              <section class="gestao-editor" [attr.aria-labelledby]="'dados-unidade-' + u.id">
                <h4 [id]="'dados-unidade-' + u.id" tabindex="-1" data-gestao-foco>Dados da unidade</h4>
                <form [attr.data-rascunho]="u.id" (submit)="salvar($event, u, nomeEditado.value, fusoEditado.value, ativa.checked)">
                  <div class="gestao-campos">
                    <div>
                      <label [for]="'nome-' + u.id">Nome da unidade</label>
                      <input #nomeEditado [id]="'nome-' + u.id" [value]="u.nome" required maxlength="120" [disabled]="ocupado()">
                    </div>
                    <div>
                      <label [for]="'fuso-' + u.id">Fuso da unidade</label>
                      <input #fusoEditado [id]="'fuso-' + u.id" [value]="u.fuso" required maxlength="60"
                        [attr.aria-describedby]="fusoInvalido() ? 'erro-unidades' : null"
                        [attr.aria-invalid]="fusoInvalido() ? true : null"
                        [disabled]="ocupado()">
                    </div>
                  </div>
                  <label class="gestao-opcao"><input #ativa type="checkbox" [checked]="u.ativa" [disabled]="ocupado()"> Unidade ativa</label>
                  <p>Inativar bloqueia novas vendas e remove a unidade da lista pública, preservando o cadastro, os vínculos e a resolução de operações existentes por usuários autorizados.</p>
                  <div class="gestao-acoes">
                    <button [disabled]="ocupado()">Salvar unidade</button>
                    <button type="button" data-variant="ghost" (click)="cancelar(nova)" [disabled]="ocupado()">Cancelar</button>
                  </div>
                </form>
              </section>
            } @else if (editorDaUnidade('horarios', u.id)) {
              <div class="gestao-editor">
                <app-funcionamento-unidade
                  [unidadeId]="u.id" [nome]="u.nome" [bloqueado]="ocupado() || !!pendente()"
                  (bloqueio)="bloquearFuncionamento($event)" (salvo)="salvo.emit('funcionamento-' + u.id)"
                />
                <button type="button" data-variant="ghost" (click)="cancelar(nova)" [disabled]="ocupado()">Fechar horários</button>
              </div>
            }
          </article>
        } @empty {
          <p class="vazio">Nenhuma unidade nesta página.</p>
        }
      </div>
      <nav class="gestao-acoes" aria-label="Páginas de unidades">
        <button data-variant="outline" (click)="mudarPagina(-1)" [disabled]="ocupado() || pagina() === 0">Página anterior de unidades</button>
        <span>Página {{ pagina() + 1 }}</span>
        <button data-variant="outline" (click)="mudarPagina(1)" [disabled]="ocupado() || unidades().length < 50">Próxima página de unidades</button>
      </nav>
    </section>
  `,
  styles: `
    :host { display: block; }
    .confirmacao { justify-content: start; align-items: end; }
    .gestao-linha h3 { margin: 0; }
    .gestao-lista + nav { margin-top: var(--gestao-espaco-3, 12px); }
  `,
})
export class UnidadesComponent implements OnInit {
  private readonly sessao = inject(SessaoService);
  private readonly formulario = inject(FormularioRotaDirective, { optional: true });
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private origem: HTMLElement | null = null;
  readonly editor = signal<EditorUnidade | null>(null);
  readonly fusoInvalido = signal(false);
  readonly unidades = signal<Unidade[]>([]);
  readonly pagina = signal(0);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly senhaInvalida = signal(false);
  readonly aviso = signal('');
  readonly pendente = inject(CriacaoPendenteService).daConta(this.sessao.identidade()!.usuarioId);
  readonly bloqueio = output<boolean>();
  readonly salvo = output<string>();
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('nova') nova?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    void this.carregar();
  }

  criando(): boolean {
    return this.editor()?.tipo === 'novo' || !!this.pendente();
  }

  editorDaUnidade(tipo: 'dados' | 'horarios', id: string): boolean {
    const editor = this.editor();
    return editor?.tipo === tipo && editor.id === id;
  }

  abrir(editor: EditorUnidade, origem: HTMLElement): void {
    if (this.ocupado() || this.pendente()) return;
    const atual = this.editor();
    const mesmaUnidade =
      editor.tipo === 'novo' || (atual?.tipo !== 'novo' && atual?.id === editor.id);
    if (atual?.tipo === editor.tipo && mesmaUnidade) {
      this.cancelar(this.nova?.nativeElement);
      return;
    }
    if (!this.confirmarDescarte()) return;
    this.limparFeedback();
    this.origem = origem;
    this.editor.set(editor);
    focarEditor(this.host);
  }

  cancelar(alternativa?: HTMLElement): void {
    if (this.ocupado() || this.pendente() || !this.confirmarDescarte()) return;
    this.limparFeedback();
    this.fechar(alternativa);
  }

  carregar(): Promise<void> {
    return this.carregarPagina(this.pagina());
  }

  private async carregarPagina(pagina: number): Promise<void> {
    if (this.ocupado()) return;
    const chave = this.chaveEditor();
    const alterado = chave && this.formulario?.temRascunho(chave);
    if (!this.pendente() && !this.confirmarDescarte()) return;
    await this.executar(async () => {
      try {
        await this.listar(pagina);
      } catch (erro) {
        if (alterado) this.formulario?.marcarAlterado(chave);
        throw erro;
      }
      if (!this.pendente()) this.fechar(undefined, false);
    });
  }

  private chaveEditor(): string | undefined {
    const editor = this.editor();
    if (!editor) return undefined;
    if (editor.tipo === 'novo') return 'nova-unidade';
    return editor.tipo === 'horarios' ? 'funcionamento-' + editor.id : editor.id;
  }

  private confirmarDescarte(): boolean {
    const chave = this.chaveEditor();
    return !chave || (this.formulario?.confirmarDescarte(chave) ?? true);
  }

  private fechar(alternativa = this.nova?.nativeElement, restaurar = true): void {
    const origem = this.origem;
    this.origem = null;
    this.editor.set(null);
    if (restaurar) restaurarFoco(origem, alternativa);
  }

  private limparFeedback(): void {
    this.erro.set('');
    this.aviso.set('');
    this.senhaInvalida.set(false);
    this.fusoInvalido.set(false);
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
      this.fechar();
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
    this.fechar();
  }

  mudarPagina(delta: number): void {
    void this.carregarPagina(Math.max(0, this.pagina() + delta));
  }

  bloquearFuncionamento(ocupado: boolean): void {
    this.ocupado.set(ocupado);
    this.bloqueio.emit(ocupado || !!this.pendente());
  }

  private async executar(action: () => Promise<void>): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.bloqueio.emit(true);
    this.limparFeedback();
    try {
      await action();
    } catch (error) {
      this.fusoInvalido.set(error instanceof ApiFailure && error.codigo === 'FUSO_INVALIDO');
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
