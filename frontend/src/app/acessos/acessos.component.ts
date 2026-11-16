import { Component, ElementRef, OnInit, ViewChild, inject, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { FormularioRotaDirective } from '../rotas/formulario-rota.directive';
import { focarEditor, restaurarFoco } from '../ui/foco-gestao';

interface Acao {
  codigo: string;
  descricao: string;
  escopo: string;
  dependencia: string | null;
}

interface Matriz {
  versao: number;
  acoes: Acao[];
  perfis: Record<string, string[]>;
}

interface Unidade {
  id: string;
  nome: string;
}

interface Funcionario {
  id: string;
  email: string;
  perfil: string;
  ativo: boolean;
  versao: number;
  unidades: string[];
}

@Component({
  selector: 'app-acessos',
  imports: [RouterLink],
  template: `
    <section aria-labelledby="acessos-titulo" [attr.aria-busy]="ocupado()">
      <div class="gestao-toolbar">
        <h2 id="acessos-titulo">Configurações de acessos</h2>
        <div class="gestao-acoes">
          <a class="spartan-button" routerLink="/gestao/equipe/convites">Gerenciar convites</a>
          <button #matrizBotao type="button" data-variant="outline" (click)="abrirMatriz(matrizBotao)"
            [attr.aria-expanded]="matrizAberta()" [disabled]="ocupado() || !matriz()">Matriz de permissões</button>
          <button type="button" data-variant="ghost" (click)="carregar()" [disabled]="ocupado()">Recarregar acessos</button>
        </div>
      </div>
      <form class="gestao-toolbar confirmacao" (submit)="confirmar($event, senha)">
        <div>
          <label for="confirmar-senha">Confirme sua senha</label>
          <input #senha id="confirmar-senha" type="password" autocomplete="current-password"
            required maxlength="72" [attr.aria-describedby]="senhaInvalida() ? 'erro-acessos' : null"
            [attr.aria-invalid]="senhaInvalida() ? true : null" [disabled]="ocupado()">
        </div>
        <button data-variant="outline" [disabled]="ocupado()">Confirmar identidade</button>
      </form>
      @if (erro()) {
        <p #alerta id="erro-acessos" role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p role="status">{{ aviso() }}</p>
      }
      @if (matriz(); as m) {
        @if (matrizAberta()) {
          <section class="gestao-editor" aria-labelledby="matriz-titulo">
            <h3 id="matriz-titulo" tabindex="-1" data-gestao-foco>Matriz de permissões</h3>
            <p>Administrador é protegido e cobre todas as unidades. Alterações valem na próxima operação, sem novo login.</p>
            <p>As permissões controlam as operações conforme o perfil e a unidade, incluindo pedidos, pagamentos e delivery.</p>
            <div class="gestao-campos" data-sem-rascunho>
              <div>
                <label for="perfil-acesso">Perfil operacional</label>
                <select #perfilSelect id="perfil-acesso" [value]="perfil()"
                  (change)="selecionarPerfil(perfilSelect)" [disabled]="ocupado()">
                  @for (p of perfis; track p) {
                    <option [value]="p" [selected]="perfil() === p">{{ p }}</option>
                  }
                </select>
              </div>
              <div>
                <label for="buscar-acao">Buscar ação</label>
                <input id="buscar-acao" type="search" [value]="busca()" (input)="busca.set($any($event.target).value)">
              </div>
            </div>
            <fieldset data-rascunho="matriz" [disabled]="ocupado()">
              <legend>Permissões de {{ perfil() }} · versão {{ m.versao }}</legend>
              @for (a of acoesFiltradas(); track a.codigo) {
                <div class="acao">
                  <label class="gestao-opcao"><input type="checkbox" [checked]="escolhidas().has(a.codigo)"
                    [disabled]="dependenciaObrigatoria(a.codigo)" (change)="marcar(a, $any($event.target).checked)"
                    [attr.aria-describedby]="'escopo-' + a.codigo">{{ a.descricao }}</label>
                  <small [id]="'escopo-' + a.codigo">{{ a.escopo === 'EMPRESA' ? 'Afeta toda a empresa' : 'Restrita às unidades atribuídas' }} @if (a.dependencia) {· Inclui consulta mínima: {{ a.dependencia }} }</small>
                </div>
              }
            </fieldset>
            <div class="gestao-acoes">
              <button type="button" (click)="salvarMatriz()" [disabled]="ocupado()">Salvar permissões</button>
              <button type="button" data-variant="ghost" (click)="cancelar(matrizBotao)" [disabled]="ocupado()">Fechar matriz</button>
            </div>
          </section>
        }
        <div class="gestao-lista" aria-label="Funcionários existentes">
          @for (f of equipe(); track f.id) {
            <article>
              <header class="gestao-linha">
                <div>
                  <h3>{{ f.email }}</h3>
                  <span>{{ f.perfil }} · {{ f.perfil === 'ADMINISTRADOR' ? 'Todas as unidades' : f.unidades.length + (f.unidades.length === 1 ? ' unidade' : ' unidades') }}</span>
                </div>
                <span class="gestao-estado" [attr.data-estado]="f.ativo ? 'ativo' : 'inativo'">{{ f.ativo ? 'Ativo' : 'Inativo' }}</span>
                <button #editar type="button" data-variant="outline"
                  (click)="abrirFuncionario(f, editar)" [disabled]="ocupado()"
                  [attr.aria-expanded]="rascunhoFuncionario()?.id === f.id">Editar funcionário</button>
              </header>
              @if (rascunhoFuncionario(); as rascunho) {
                @if (rascunho.id === f.id) {
                  <section class="gestao-editor" [attr.aria-labelledby]="'editar-funcionario-' + f.id"
                    [attr.data-rascunho]="'funcionario-' + f.id">
                    <h4 [id]="'editar-funcionario-' + f.id" tabindex="-1" data-gestao-foco>Editar funcionário</h4>
                    <div class="gestao-campos">
                      <div>
                        <label [for]="'perfil-' + f.id">Perfil do funcionário</label>
                        <select [id]="'perfil-' + f.id" [value]="rascunho.perfil"
                          (change)="mudarPerfil(rascunho, $any($event.target).value)" [disabled]="ocupado()">
                          <option value="ADMINISTRADOR" [selected]="rascunho.perfil === 'ADMINISTRADOR'">ADMINISTRADOR</option>
                          @for (p of perfis; track p) {
                            <option [value]="p" [selected]="rascunho.perfil === p">{{ p }}</option>
                          }
                        </select>
                      </div>
                      <label class="gestao-opcao"><input type="checkbox" [checked]="rascunho.ativo"
                        (change)="rascunho.ativo = $any($event.target).checked" [disabled]="ocupado()">Ativo</label>
                    </div>
                    @if (rascunho.perfil !== 'ADMINISTRADOR') {
                      <p>Vínculos nesta edição: {{ rascunho.unidades.length }}. Alterações só valem após salvar o funcionário.</p>
                      <button type="button" data-variant="outline" (click)="alternarUnidades(f.id)"
                        [disabled]="ocupado()" [attr.aria-expanded]="funcionarioExpandido() === f.id"
                        [attr.aria-controls]="'unidades-' + f.id">Editar unidades atribuídas</button>
                      <div [id]="'unidades-' + f.id">
                        @if (funcionarioExpandido() === f.id) {
                          <fieldset [disabled]="ocupado()">
                            <legend>Unidades atribuídas</legend>
                            @for (u of unidades(); track u.id) {
                              <label class="gestao-opcao"><input type="checkbox" [checked]="rascunho.unidades.includes(u.id)"
                                (change)="vincular(rascunho, u.id, $any($event.target).checked)">{{ u.nome }}</label>
                            }
                            @for (id of unidadesInativas(f); track id) {
                              <label class="gestao-opcao"><input type="checkbox" [checked]="rascunho.unidades.includes(id)"
                                (change)="vincular(rascunho, id, $any($event.target).checked)">Vínculo em unidade inativa · {{ id }}</label>
                            }
                            @if (unidadesInativas(f).length) {
                              <p>Unidades inativas não concedem acesso. Desmarque para remover o vínculo ao salvar; mantê-lo permite acesso quando a unidade for reativada.</p>
                            }
                          </fieldset>
                        }
                      </div>
                    } @else {
                      <p>Cobertura integral da empresa.</p>
                    }
                    <div class="gestao-acoes acoes-editor">
                      <button type="button" (click)="salvarFuncionario(rascunho)" [disabled]="ocupado()">Salvar funcionário</button>
                      <button type="button" data-variant="ghost" (click)="cancelar(matrizBotao)" [disabled]="ocupado()">Cancelar</button>
                    </div>
                  </section>
                }
              }
            </article>
          } @empty {
            <p class="vazio">Nenhum funcionário nesta página.</p>
          }
        </div>
        <nav class="gestao-acoes" aria-label="Páginas de funcionários">
          <button data-variant="outline" (click)="paginaAnterior()" [disabled]="ocupado() || pagina() === 0">Página anterior</button>
          <span>Página {{ pagina() + 1 }}</span>
          <button data-variant="outline" (click)="proximaPagina()" [disabled]="ocupado() || equipe().length < 50">Próxima página</button>
        </nav>
      }
    </section>
  `,
  styles: `
    :host { display: block; }
    .confirmacao { justify-content: start; align-items: end; }
    .gestao-linha h3 { margin: 0; }
    .gestao-lista + nav { margin-top: var(--gestao-espaco-3, 12px); }
    .acoes-editor { margin-top: var(--gestao-espaco-2, 8px); }
    .acao { border-bottom: 1px solid var(--rm-border); padding-bottom: var(--gestao-espaco-2, 8px); }
    .acao:last-child { border-bottom: 0; }
    .acao small { display: block; overflow-wrap: anywhere; }
  `,
})
export class AcessosComponent implements OnInit {
  private readonly sessao = inject(SessaoService);
  private readonly formulario = inject(FormularioRotaDirective, { optional: true });
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private origem: HTMLElement | null = null;
  readonly matrizAberta = signal(false);
  readonly rascunhoFuncionario = signal<Funcionario | null>(null);
  readonly perfis = ['GERENTE', 'ATENDIMENTO', 'CAIXA', 'COZINHA', 'EXPEDICAO'];
  readonly matriz = signal<Matriz | null>(null);
  readonly equipe = signal<Funcionario[]>([]);
  readonly vinculosOriginais = signal<Record<string, string[]>>({});
  readonly unidades = signal<Unidade[]>([]);
  readonly perfil = signal('GERENTE');
  readonly escolhidas = signal(new Set<string>());
  readonly busca = signal('');
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly senhaInvalida = signal(false);
  readonly aviso = signal('');
  readonly pagina = signal(0);
  readonly funcionarioExpandido = signal<string | null>(null);
  readonly bloqueio = output<boolean>();
  readonly salvo = output<string>();
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('matrizBotao') matrizBotao?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    void this.carregar();
  }

  abrirMatriz(origem: HTMLElement): void {
    if (this.ocupado() || !this.matriz()) return;
    if (this.matrizAberta()) {
      this.cancelar(origem);
      return;
    }
    if (!this.confirmarDescarte()) return;
    this.limparFeedback();
    this.origem = origem;
    this.fecharFuncionario();
    this.matrizAberta.set(true);
    focarEditor(this.host);
  }

  abrirFuncionario(funcionario: Funcionario, origem: HTMLElement): void {
    if (this.ocupado()) return;
    if (this.rascunhoFuncionario()?.id === funcionario.id) {
      this.cancelar(origem);
      return;
    }
    if (!this.confirmarDescarte()) return;
    this.limparFeedback();
    this.origem = origem;
    this.matrizAberta.set(false);
    this.selecionar(this.perfil());
    this.funcionarioExpandido.set(null);
    this.rascunhoFuncionario.set(this.copiarFuncionario(funcionario));
    focarEditor(this.host);
  }

  cancelar(alternativa?: HTMLElement): void {
    if (this.ocupado() || !this.confirmarDescarte()) return;
    this.limparFeedback();
    this.matrizAberta.set(false);
    this.selecionar(this.perfil());
    this.fecharFuncionario();
    restaurarFoco(this.origem, alternativa);
    this.origem = null;
  }

  async carregar(pagina = this.pagina()): Promise<void> {
    if (this.ocupado()) return;
    const chave = this.chaveEditor();
    const alterado = chave && this.formulario?.temRascunho(chave);
    if (!this.confirmarDescarte()) return;
    await this.executar(async () => {
      try {
        const m = await this.sessao.api<Matriz>('/api/v1/configuracoes/acessos');
        const e = await this.sessao.api<Funcionario[]>('/api/v1/equipe?pagina=' + pagina);
        const u = await this.sessao.api<Unidade[]>('/api/v1/operacao/unidades');
        this.matriz.set(m);
        this.equipe.set(e);
        this.vinculosOriginais.set(Object.fromEntries(e.map((f) => [f.id, [...f.unidades]])));
        this.unidades.set(u);
        this.pagina.set(pagina);
        this.selecionar(this.perfil());
        this.fecharFuncionario();
        if (!this.matrizAberta()) this.origem = null;
      } catch (erro) {
        if (alterado) this.formulario?.marcarAlterado(chave);
        throw erro;
      }
    });
  }

  selecionarPerfil(campo: HTMLSelectElement): void {
    if (!this.confirmarDescarte()) {
      campo.value = this.perfil();
      return;
    }
    this.selecionar(campo.value);
  }

  private chaveEditor(): string | undefined {
    if (this.matrizAberta()) return 'matriz';
    const rascunho = this.rascunhoFuncionario();
    return rascunho ? 'funcionario-' + rascunho.id : undefined;
  }

  private confirmarDescarte(): boolean {
    const chave = this.chaveEditor();
    return !chave || (this.formulario?.confirmarDescarte(chave) ?? true);
  }

  private copiarFuncionario(funcionario: Funcionario): Funcionario {
    return { ...funcionario, unidades: [...funcionario.unidades] };
  }

  private fecharFuncionario(): void {
    this.funcionarioExpandido.set(null);
    this.rascunhoFuncionario.set(null);
  }

  private limparFeedback(): void {
    this.erro.set('');
    this.aviso.set('');
    this.senhaInvalida.set(false);
  }

  selecionar(perfil: string): void {
    this.perfil.set(perfil);
    this.escolhidas.set(new Set(this.matriz()?.perfis[perfil] ?? []));
  }

  acoesFiltradas(): Acao[] {
    const busca = this.busca().toLocaleLowerCase('pt-BR');
    return (
      this.matriz()?.acoes.filter((a) =>
        (a.descricao + ' ' + a.codigo).toLocaleLowerCase('pt-BR').includes(busca),
      ) ?? []
    );
  }

  dependenciaObrigatoria(codigo: string): boolean {
    return (
      this.matriz()?.acoes.some(
        (a) => a.dependencia === codigo && this.escolhidas().has(a.codigo),
      ) ?? false
    );
  }

  marcar(acao: Acao, marcado: boolean): void {
    const a = new Set(this.escolhidas());
    if (marcado) {
      a.add(acao.codigo);
      if (acao.dependencia) a.add(acao.dependencia);
    } else a.delete(acao.codigo);
    this.escolhidas.set(a);
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

  async salvarMatriz(): Promise<void> {
    await this.executar(async () => {
      const m = await this.sessao.api<Matriz>('/api/v1/configuracoes/acessos', 'PUT', {
        versao: this.matriz()?.versao,
        perfil: this.perfil(),
        acoes: [...this.escolhidas()],
      });
      this.matriz.set(m);
      this.selecionar(this.perfil());
      this.aviso.set('Permissões salvas no servidor.');
      this.salvo.emit('matriz');
    });
  }

  mudarPerfil(f: Funcionario, perfil: string): void {
    f.perfil = perfil;
    if (perfil === 'ADMINISTRADOR') {
      f.unidades = [];
      if (this.funcionarioExpandido() === f.id) this.funcionarioExpandido.set(null);
    }
  }

  alternarUnidades(id: string): void {
    if (!this.ocupado()) this.funcionarioExpandido.update((atual) => (atual === id ? null : id));
  }

  unidadesInativas(f: Funcionario): string[] {
    return (this.vinculosOriginais()[f.id] ?? []).filter(
      (id) => !this.unidades().some((u) => u.id === id),
    );
  }

  vincular(f: Funcionario, id: string, marcado: boolean): void {
    f.unidades = marcado ? [...new Set([...f.unidades, id])] : f.unidades.filter((u) => u !== id);
  }

  async salvarFuncionario(f: Funcionario): Promise<void> {
    let confirmado = false;
    await this.executar(async () => {
      const result = await this.sessao.api<Funcionario>('/api/v1/equipe/' + f.id, 'PUT', {
        versao: f.versao,
        perfil: f.perfil,
        ativo: f.ativo,
        unidades: f.unidades,
      });
      this.equipe.update((rows) => rows.map((row) => (row.id === result.id ? result : row)));
      this.vinculosOriginais.update((rows) => ({ ...rows, [result.id]: [...result.unidades] }));
      this.aviso.set('Funcionário atualizado no servidor.');
      this.salvo.emit('funcionario-' + result.id);
      confirmado = true;
      this.fecharFuncionario();
      await this.sessao.atualizarIdentidade();
    });
    if (confirmado && !this.erro()) restaurarFoco(this.origem, this.matrizBotao?.nativeElement);
    if (confirmado) this.origem = null;
  }

  paginaAnterior(): void {
    void this.carregar(Math.max(0, this.pagina() - 1));
  }

  proximaPagina(): void {
    void this.carregar(this.pagina() + 1);
  }

  private async executar(action: () => Promise<void>): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.bloqueio.emit(true);
    this.limparFeedback();
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
      this.bloqueio.emit(false);
    }
  }
}
