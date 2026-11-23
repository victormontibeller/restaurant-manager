import { Component, ElementRef, OnInit, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { FormularioRotaDirective } from '../rotas/formulario-rota.directive';
import { HlmButton } from '../ui/button';
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
  imports: [HlmButton, FuncionamentoUnidadeComponent],
  templateUrl: './unidades.component.html',
  styleUrl: './unidades.component.css',
})
export class UnidadesComponent implements OnInit {
  private readonly sessao = inject(SessaoService);
  private readonly formulario = inject(FormularioRotaDirective, { optional: true });
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private origem: HTMLElement | null = null;
  readonly editor = signal<EditorUnidade | null>(null);
  readonly fusosComuns = ['America/Sao_Paulo', 'America/Manaus', 'America/Belem', 'UTC'];
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

  aplicarFuso(campo: HTMLInputElement, valor: string): void {
    campo.value = valor;
    campo.dispatchEvent(new Event('input', { bubbles: true }));
    this.fusoInvalido.set(false);
  }

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
