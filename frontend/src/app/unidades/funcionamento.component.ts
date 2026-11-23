import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { FormularioRotaDirective } from '../rotas/formulario-rota.directive';

type Canal = 'DELIVERY' | 'RETIRADA' | 'MESA';

interface Horario {
  canal: Canal;
  diaSemana: number;
  inicio: string;
  fim: string;
}

interface LinhaHorario extends Horario {
  chave: number;
}

interface Funcionamento {
  unidadeId: string;
  versao: number;
  versaoUnidade: number;
  fuso: string;
  canais: Canal[];
  horarios: Horario[];
}

@Component({
  selector: 'app-funcionamento-unidade',
  template: `
    <section [attr.data-rascunho]="'funcionamento-' + unidadeId" [attr.aria-labelledby]="'funcionamento-titulo-' + unidadeId" [attr.aria-busy]="ocupado()">
      <header class="funcionamento-cabecalho">
      <h4 [id]="'funcionamento-titulo-' + unidadeId" tabindex="-1" data-gestao-foco>Horários e canais de {{ nome }}</h4>
      <button
        type="button"
        (click)="consultar()" data-variant="outline"
        [disabled]="bloqueado || ocupado()"
        [attr.aria-controls]="'funcionamento-editor-' + unidadeId"
      >{{ aberto() ? 'Consultar funcionamento no servidor' : 'Configurar horários e canais' }}</button>
      </header>
      @if (aberto()) {
        <div [id]="'funcionamento-editor-' + unidadeId">
          @if (versao() !== null) {
            <p>Horários no fuso {{ fusoConsultado() }}. As alterações só passam a valer após a confirmação do servidor.</p>
          }
          <p [id]="'funcionamento-ajuda-' + unidadeId">O dia indica o início do atendimento. Um fim anterior ao início termina no dia seguinte; use 24:00 para meia-noite ao final do dia. Início e fim iguais não são aceitos. Intervalos não podem se sobrepor no mesmo canal.</p>
          @if (erro()) {
            <p #alerta role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
          }
          @if (aviso()) {
            <p role="status">{{ aviso() }}</p>
          }
          @if (reconsultaObrigatoria()) {
            <p>Consulte o funcionamento no servidor para conferir o resultado e a versão atual antes de editar ou salvar novamente. A consulta substitui o rascunho exibido.</p>
          }
          @if (versao() !== null) {
            <p class="versao-funcionamento">Versão do funcionamento: {{ versao() }}.</p>
            <ul class="dias-funcionamento" aria-label="Inícios de turnos no rascunho">
              @for (dia of dias; track dia.valor) {
                <li [class.com-turno]="diasComTurno().has(dia.valor)">
                  <strong>{{ dia.rotulo.split('-')[0] }}</strong>
                  <span>{{ diasComTurno().has(dia.valor) ? 'Com início' : 'Sem início' }}</span>
                </li>
              }
            </ul>
            <form (submit)="salvar($event)">
              <fieldset class="canais-funcionamento" [disabled]="bloqueado || ocupado() || reconsultaObrigatoria()">
                <legend>Canais habilitados</legend>
                @for (canal of opcoesCanais; track canal.valor) {
                  <label class="canal" [class.canal-ativo]="canais().includes(canal.valor)"><input
                    #habilitado
                    type="checkbox"
                    [checked]="canais().includes(canal.valor)"
                    (change)="habilitar(canal.valor, habilitado.checked)"
                  >{{ canal.rotulo }}</label>
                }
              </fieldset>
              <p>Sem horário cadastrado, o canal fica fechado. Desabilitar um canal preserva seus horários para uma futura reativação.</p>
              @for (horario of horarios(); track horario.chave; let indice = $index) {
                <fieldset
                  class="horario gestao-campos"
                  [disabled]="bloqueado || ocupado() || reconsultaObrigatoria()"
                  [attr.aria-describedby]="'funcionamento-ajuda-' + unidadeId"
                >
                  <legend>Horário {{ indice + 1 }}</legend>
                  <div>
                    <label [for]="campo(horario.chave, 'canal')">Canal</label>
                    <select
                      #canalHorario
                      [id]="campo(horario.chave, 'canal')"
                      [value]="horario.canal"
                      (change)="alterarCanal(horario.chave, canalHorario.value)"
                    >
                      @for (canal of opcoesCanais; track canal.valor) {
                        <option [value]="canal.valor" [selected]="canal.valor === horario.canal">{{ canal.rotulo }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label [for]="campo(horario.chave, 'dia')">Dia de início</label>
                    <select
                      #dia
                      [id]="campo(horario.chave, 'dia')"
                      [value]="horario.diaSemana"
                      (change)="alterarDia(horario.chave, dia.value)"
                    >
                      @for (dia of dias; track dia.valor) {
                        <option [value]="dia.valor" [selected]="dia.valor === horario.diaSemana">{{ dia.rotulo }}</option>
                      }
                    </select>
                  </div>
                  <div>
                    <label [for]="campo(horario.chave, 'inicio')">Início (HH:mm)</label>
                    <input
                      #inicio
                      [id]="campo(horario.chave, 'inicio')"
                      type="text"
                      autocomplete="off"
                      placeholder="09:00"
                      maxlength="5"
                      pattern="([01][0-9]|2[0-3]):[0-5][0-9]"
                      required
                      [value]="horario.inicio"
                      (input)="alterarHora(horario.chave, 'inicio', inicio.value)"
                    >
                  </div>
                  <div>
                    <label [for]="campo(horario.chave, 'fim')">Fim (HH:mm ou 24:00)</label>
                    <input
                      #fim
                      [id]="campo(horario.chave, 'fim')"
                      type="text"
                      autocomplete="off"
                      placeholder="18:00"
                      maxlength="5"
                      pattern="(([01][0-9]|2[0-3]):[0-5][0-9]|24:00)"
                      required
                      [value]="horario.fim"
                      (input)="alterarHora(horario.chave, 'fim', fim.value)"
                    >
                  </div>
                  @if (horario.fim < horario.inicio) {
                    <small>Este horário termina no dia seguinte ao selecionado.</small>
                  }
                  <button class="remover-horario" type="button" data-variant="ghost" (click)="remover(horario.chave)">Remover horário {{ indice + 1 }}</button>
                </fieldset>
              } @empty {
                <p>Nenhum horário cadastrado. Todos os canais ficam fechados até que seus horários sejam definidos e habilitados.</p>
              }
              <p>{{ horarios().length }} de 84 horários cadastrados.</p>
              <p>Para salvar, confirme sua identidade no formulário acima. A confirmação vale por cinco minutos.</p>
              <div class="gestao-acoes">
                <button [disabled]="bloqueado || ocupado() || reconsultaObrigatoria()">Salvar funcionamento</button>
                <button type="button" data-variant="outline" (click)="adicionar()"
                  [disabled]="bloqueado || ocupado() || reconsultaObrigatoria() || horarios().length >= 84">Adicionar horário</button>
              </div>
            </form>
          }
        </div>
      }
    </section>
  `,
  styles: `
    :host { display: block; min-width: 0; }
    .funcionamento-cabecalho { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.7rem; }
    .funcionamento-cabecalho h4 { margin: 0; }
    .versao-funcionamento { width: fit-content; font-size: 0.78rem; font-weight: 650; border: 1px solid var(--border); border-radius: 999px; background: var(--secondary); padding: 0.35rem 0.65rem; }
    .dias-funcionamento {
      display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 5rem), 1fr));
      gap: 0.4rem; list-style: none; padding: 0; margin-block: 0.85rem;
    }
    .dias-funcionamento li {
      display: grid; gap: 0.15rem; text-align: center; padding: 0.5rem;
      border-radius: 12px; border: 1px solid var(--border); background: var(--card);
      font-size: 0.77rem;
    }
    .dias-funcionamento .com-turno { background: var(--accent); border-color: var(--accent-border); color: var(--accent-foreground); }
    fieldset { border: 1px solid var(--border); background: var(--card); border-radius: var(--radius-lg); }
    legend { font-weight: 700; color: var(--primary-ink); }
    .canais-funcionamento { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)); gap: 0.55rem; }
    .canais-funcionamento .canal { margin: 0; border: 1px solid var(--border); border-radius: 10px; background: var(--background); padding-inline: 0.7rem; }
    .canais-funcionamento .canal-ativo { background: var(--primary-soft); border-color: var(--primary-soft-border); }
    .horario small { padding: 0.65rem; border-radius: 10px; background: var(--amber-bg); color: var(--amber-fg); }

    .horario { align-items: end; }
    .horario small, .remover-horario { grid-column: 1 / -1; }
    .remover-horario { justify-self: start; }
    .canal {
      display: inline-flex;
      align-items: center;
      min-height: var(--gestao-controle, 48px);
      gap: var(--gestao-espaco-2, 8px);
      margin-inline-end: var(--gestao-espaco-4, 16px);
    }
  `,
})
export class FuncionamentoUnidadeComponent {
  @Input({ required: true }) unidadeId = '';
  @Input() nome = '';
  @Input() bloqueado = false;
  @Output() readonly bloqueio = new EventEmitter<boolean>();
  @Output() readonly salvo = new EventEmitter<void>();
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  private readonly sessao = inject(SessaoService);
  private readonly formulario = inject(FormularioRotaDirective, { optional: true });
  private readonly conta = this.sessao.identidade()?.usuarioId;
  private geracao = 0;
  private proximaChave = 0;
  private destruido = false;
  readonly aberto = signal(false);
  readonly ocupado = signal(false);
  readonly versao = signal<number | null>(null);
  readonly versaoUnidade = signal<number | null>(null);
  readonly fusoConsultado = signal('');
  readonly canais = signal<Canal[]>([]);
  readonly horarios = signal<LinhaHorario[]>([]);
  readonly diasComTurno = computed(() => {
    const canais = this.canais();
    return new Set(
      this.horarios()
        .filter((horario) => canais.includes(horario.canal))
        .map((horario) => horario.diaSemana),
    );
  });
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly reconsultaObrigatoria = signal(false);
  readonly opcoesCanais: { valor: Canal; rotulo: string }[] = [
    { valor: 'DELIVERY', rotulo: 'Delivery' },
    { valor: 'RETIRADA', rotulo: 'Retirada' },
    { valor: 'MESA', rotulo: 'Mesa' },
  ];
  readonly dias = [
    { valor: 1, rotulo: 'Segunda-feira' },
    { valor: 2, rotulo: 'Terça-feira' },
    { valor: 3, rotulo: 'Quarta-feira' },
    { valor: 4, rotulo: 'Quinta-feira' },
    { valor: 5, rotulo: 'Sexta-feira' },
    { valor: 6, rotulo: 'Sábado' },
    { valor: 7, rotulo: 'Domingo' },
  ];

  constructor() {
    afterNextRender(() => void this.consultar());
    effect(() => {
      if (this.conta !== this.sessao.identidade()?.usuarioId) this.encerrar();
    });
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.encerrar();
    });
  }

  campo(chave: number, campo: string): string {
    return 'funcionamento-' + this.unidadeId + '-' + chave + '-' + campo;
  }

  async consultar(): Promise<void> {
    if (!this.podeIniciar()) return;
    const chave = 'funcionamento-' + this.unidadeId;
    const alterado = this.formulario?.temRascunho(chave);
    if (!this.reconsultaObrigatoria() && this.formulario?.confirmarDescarte(chave) === false)
      return;
    this.aberto.set(true);
    const geracao = ++this.geracao;
    const unidade = this.unidadeId;
    this.iniciar();
    try {
      const dados = await this.sessao.api<Funcionamento>(this.rota(unidade));
      if (!this.vigente(geracao, unidade)) return;
      this.receber(dados, unidade);
      this.aviso.set('Funcionamento consultado no servidor. O rascunho usa a versão atual.');
      this.formulario?.confirmarSalvo(chave);
    } catch (error) {
      if (this.vigente(geracao, unidade)) {
        if (alterado) this.formulario?.marcarAlterado(chave);
        this.falhar(error, false);
      }
    } finally {
      if (this.vigente(geracao, unidade)) this.finalizar();
    }
  }

  habilitar(canal: Canal, habilitado: boolean): void {
    if (!this.podeEditar()) return;
    this.canais.update((canais) =>
      this.opcoesCanais
        .map((opcao) => opcao.valor)
        .filter((valor) => (valor === canal ? habilitado : canais.includes(valor))),
    );
    this.aviso.set('');
  }

  adicionar(): void {
    if (!this.podeEditar() || this.horarios().length >= 84) return;
    this.horarios.update((horarios) => [
      ...horarios,
      {
        chave: this.proximaChave++,
        canal: this.canais()[0] ?? 'DELIVERY',
        diaSemana: 1,
        inicio: '09:00',
        fim: '18:00',
      },
    ]);
    this.aviso.set('');
    this.formulario?.marcarAlterado('funcionamento-' + this.unidadeId);
  }

  remover(chave: number): void {
    if (!this.podeEditar()) return;
    this.horarios.update((horarios) => horarios.filter((horario) => horario.chave !== chave));
    this.aviso.set('');
    this.formulario?.marcarAlterado('funcionamento-' + this.unidadeId);
  }

  alterarCanal(chave: number, canal: string): void {
    if (!this.opcoesCanais.some((opcao) => opcao.valor === canal)) return;
    this.alterar(chave, { canal: canal as Canal });
  }

  alterarDia(chave: number, dia: string): void {
    const diaSemana = Number(dia);
    if (!this.dias.some((opcao) => opcao.valor === diaSemana)) return;
    this.alterar(chave, { diaSemana });
  }

  alterarHora(chave: number, campo: 'inicio' | 'fim', valor: string): void {
    this.alterar(chave, { [campo]: valor });
  }

  async salvar(event: Event): Promise<void> {
    event.preventDefault();
    if (!this.podeEditar()) return;
    const geracao = ++this.geracao;
    const unidade = this.unidadeId;
    const body = {
      versao: this.versao(),
      versaoUnidade: this.versaoUnidade(),
      canais: [...this.canais()],
      horarios: this.horarios().map(({ canal, diaSemana, inicio, fim }) => ({
        canal,
        diaSemana,
        inicio,
        fim,
      })),
    };
    this.iniciar();
    try {
      const dados = await this.sessao.api<Funcionamento>(this.rota(unidade), 'PUT', body);
      if (!this.vigente(geracao, unidade)) return;
      this.receber(dados, unidade);
      this.aviso.set('Funcionamento salvo no servidor.');
      this.salvo.emit();
    } catch (error) {
      if (this.vigente(geracao, unidade)) this.falhar(error, true);
    } finally {
      if (this.vigente(geracao, unidade)) this.finalizar();
    }
  }

  private alterar(chave: number, valores: Partial<Horario>): void {
    if (!this.podeEditar()) return;
    this.horarios.update((horarios) =>
      horarios.map((horario) => (horario.chave === chave ? { ...horario, ...valores } : horario)),
    );
    this.aviso.set('');
  }

  private podeIniciar(): boolean {
    return !this.bloqueado && !this.ocupado() && this.vigente(this.geracao, this.unidadeId);
  }

  private podeEditar(): boolean {
    return (
      this.podeIniciar() &&
      this.versao() !== null &&
      this.versaoUnidade() !== null &&
      !this.reconsultaObrigatoria()
    );
  }

  private vigente(geracao: number, unidade: string): boolean {
    return (
      !this.destruido &&
      geracao === this.geracao &&
      unidade === this.unidadeId &&
      !!this.conta &&
      this.conta === this.sessao.identidade()?.usuarioId
    );
  }

  private rota(unidade: string): string {
    return '/api/v1/configuracoes/unidades/' + encodeURIComponent(unidade) + '/funcionamento';
  }

  private iniciar(): void {
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.bloqueio.emit(true);
  }

  private finalizar(): void {
    this.ocupado.set(false);
    this.bloqueio.emit(false);
  }

  private receber(dados: Funcionamento, unidade: string): void {
    if (dados.unidadeId !== unidade) throw new Error('A resposta não corresponde à unidade.');
    this.versao.set(dados.versao);
    this.versaoUnidade.set(dados.versaoUnidade);
    this.fusoConsultado.set(dados.fuso);
    this.canais.set([...dados.canais]);
    this.horarios.set(
      dados.horarios.map((horario) => ({ ...horario, chave: this.proximaChave++ })),
    );
    this.reconsultaObrigatoria.set(false);
  }

  private falhar(error: unknown, escrita: boolean): void {
    const falha = error instanceof ApiFailure ? error : null;
    const reautenticar = falha?.status === 403 && falha.codigo === 'REAUTENTICACAO_NECESSARIA';
    if (falha && [401, 403, 404].includes(falha.status) && !reautenticar) {
      this.versao.set(null);
      this.versaoUnidade.set(null);
      this.fusoConsultado.set('');
      this.canais.set([]);
      this.horarios.set([]);
    }
    // Falha incerta ou conflito nunca permite reenviar a versão sem consultar.
    this.reconsultaObrigatoria.set(
      !escrita || !falha || falha.status >= 500 || falha.status === 409,
    );
    this.erro.set(
      reautenticar
        ? 'Confirme sua identidade no formulário acima antes de salvar o funcionamento.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível confirmar o funcionamento. Consulte o servidor antes de continuar.',
    );
    const geracao = this.geracao;
    const unidade = this.unidadeId;
    setTimeout(() => {
      if (this.vigente(geracao, unidade)) this.alerta?.nativeElement.focus();
    });
  }

  private encerrar(): void {
    this.geracao++;
    this.aberto.set(false);
    this.versao.set(null);
    this.versaoUnidade.set(null);
    this.fusoConsultado.set('');
    this.canais.set([]);
    this.horarios.set([]);
    this.erro.set('');
    this.aviso.set('');
    this.reconsultaObrigatoria.set(false);
    if (this.ocupado() && !this.destruido) this.bloqueio.emit(false);
    this.ocupado.set(false);
  }
}
