import { Component, ElementRef, OnInit, ViewChild, inject, output, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { FormularioRotaDirective } from '../rotas/formulario-rota.directive';
import { focarEditor, restaurarFoco } from '../ui/foco-gestao';
import { PERFIS_OPERACIONAIS, nomePerfil } from './perfis';

interface Unidade {
  id: string;
  nome: string;
}

interface Funcionario {
  nome: string | null;
  emailVerificado: boolean;
  criadoEm: string;
  id: string;
  email: string;
  perfil: string;
  ativo: boolean;
  versao: number;
  unidades: string[];
}

@Component({
  selector: 'app-equipe',
  imports: [RouterLink, DatePipe],
  styleUrls: ['../ui/administracao.css', './corporativo.css', './equipe.component.css'],
  template: `
    <section class="admin-pagina" aria-label="Funcionários" [attr.aria-busy]="ocupado()">
      <div class="gestao-acoes corporativo-atalhos">
        <a class="spartan-button" routerLink="/gestao/equipe/convites">Gerenciar convites</a>
        <button #recarregar type="button" data-variant="outline" (click)="carregar()" [disabled]="ocupado()">Recarregar equipe</button>
      </div>
      <form class="admin-painel admin-filtros corporativo-identidade" (submit)="confirmar($event, senha)">
        <h2>Confirmar identidade</h2>
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
      @if (carregado()) {
        <div class="gestao-lista" aria-label="Funcionários existentes">
          @for (f of equipe(); track f.id) {
            <article class="corporativo-registro">
              <header class="gestao-linha">
                <div>
                  <h3>{{ f.nome || f.email }}</h3>
                  @if (f.nome) { <p>{{ f.email }}</p> }
                  <span>{{ nomePerfil(f.perfil) }} · {{ f.perfil === 'ADMINISTRADOR' ? 'Todas as unidades' : f.unidades.length + (f.unidades.length === 1 ? ' unidade' : ' unidades') }}</span>
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
                    <p>{{ f.emailVerificado ? 'E-mail verificado' : 'Verificação de e-mail pendente' }} · Cadastro em {{ f.criadoEm | date: 'dd/MM/yyyy' }}</p>
                    <div class="gestao-campos">
                      <div>
                        <label [for]="'perfil-' + f.id">Perfil do funcionário</label>
                        <select [id]="'perfil-' + f.id" [value]="rascunho.perfil"
                          (change)="mudarPerfil(rascunho, $any($event.target).value)" [disabled]="ocupado()">
                          <option value="ADMINISTRADOR" [selected]="rascunho.perfil === 'ADMINISTRADOR'">Administrador</option>
                          @for (p of perfis; track p.codigo) {
                            <option [value]="p.codigo" [selected]="rascunho.perfil === p.codigo">{{ p.nome }}</option>
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
                      <button type="button" data-variant="ghost" (click)="cancelar(recarregar)" [disabled]="ocupado()">Cancelar</button>
                    </div>
                  </section>
                }
              }
            </article>
          } @empty {
            <p class="vazio">Nenhum funcionário nesta página.</p>
          }
        </div>
        <nav class="gestao-acoes admin-paginacao" aria-label="Páginas de funcionários">
          <button data-variant="outline" (click)="paginaAnterior()" [disabled]="ocupado() || pagina() === 0">Página anterior</button>
          <span>Página {{ pagina() + 1 }}</span>
          <button data-variant="outline" (click)="proximaPagina()" [disabled]="ocupado() || equipe().length < 50">Próxima página</button>
        </nav>
      }
    </section>
  `,
})
export class EquipeComponent implements OnInit {
  private readonly sessao = inject(SessaoService);
  private readonly formulario = inject(FormularioRotaDirective, { optional: true });
  private readonly host = inject(ElementRef<HTMLElement>).nativeElement;
  private origem: HTMLElement | null = null;
  readonly rascunhoFuncionario = signal<Funcionario | null>(null);
  readonly perfis = PERFIS_OPERACIONAIS;
  readonly nomePerfil = nomePerfil;
  readonly carregado = signal(false);
  readonly equipe = signal<Funcionario[]>([]);
  readonly vinculosOriginais = signal<Record<string, string[]>>({});
  readonly unidades = signal<Unidade[]>([]);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly senhaInvalida = signal(false);
  readonly aviso = signal('');
  readonly pagina = signal(0);
  readonly funcionarioExpandido = signal<string | null>(null);
  readonly bloqueio = output<boolean>();
  readonly salvo = output<string>();
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('recarregar') recarregar?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    void this.carregar();
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
    this.funcionarioExpandido.set(null);
    this.rascunhoFuncionario.set(this.copiarFuncionario(funcionario));
    focarEditor(this.host);
  }

  cancelar(alternativa?: HTMLElement): void {
    if (this.ocupado() || !this.confirmarDescarte()) return;
    this.limparFeedback();
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
        const e = await this.sessao.api<Funcionario[]>('/api/v1/equipe?pagina=' + pagina);
        const u = await this.sessao.api<Unidade[]>('/api/v1/operacao/unidades');
        this.equipe.set(e);
        this.vinculosOriginais.set(Object.fromEntries(e.map((f) => [f.id, [...f.unidades]])));
        this.unidades.set(u);
        this.pagina.set(pagina);
        this.fecharFuncionario();
        this.carregado.set(true);
        this.origem = null;
      } catch (erro) {
        if (alterado) this.formulario?.marcarAlterado(chave);
        throw erro;
      }
    });
  }

  private chaveEditor(): string | undefined {
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

  async confirmar(event: Event, input: HTMLInputElement): Promise<void> {
    event.preventDefault();
    const senha = input.value;
    input.value = '';
    await this.executar(async () => {
      await this.sessao.api('/api/v1/auth/reautenticar', 'POST', { senha });
      this.aviso.set('Identidade confirmada por cinco minutos.');
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
    if (confirmado && !this.erro()) restaurarFoco(this.origem, this.recarregar?.nativeElement);
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
