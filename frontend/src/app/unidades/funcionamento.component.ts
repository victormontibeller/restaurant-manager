import {
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  effect,
  inject,
  signal,
} from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';

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
    <section [attr.aria-labelledby]="'funcionamento-titulo-' + unidadeId" [attr.aria-busy]="ocupado()">
      <h5 [id]="'funcionamento-titulo-' + unidadeId">Horários e canais de {{ nome }}</h5>
      <button
        type="button"
        (click)="consultar()"
        [disabled]="bloqueado || ocupado()"
        [attr.aria-expanded]="aberto()"
        [attr.aria-controls]="'funcionamento-editor-' + unidadeId"
      >{{ aberto() ? 'Consultar funcionamento no servidor' : 'Configurar horários e canais' }}</button>
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
            <p>Versão do funcionamento: {{ versao() }}.</p>
            <form (submit)="salvar($event)">
              <fieldset [disabled]="bloqueado || ocupado() || reconsultaObrigatoria()">
                <legend>Canais habilitados</legend>
                @for (canal of opcoesCanais; track canal.valor) {
                  <label class="canal"><input
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
                  class="horario"
                  [disabled]="bloqueado || ocupado() || reconsultaObrigatoria()"
                  [attr.aria-describedby]="'funcionamento-ajuda-' + unidadeId"
                >
                  <legend>Horário {{ indice + 1 }}</legend>
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
                  @if (horario.fim < horario.inicio) {
                    <small>Este horário termina no dia seguinte ao selecionado.</small>
                  }
                  <button type="button" (click)="remover(horario.chave)">Remover horário {{ indice + 1 }}</button>
                </fieldset>
              } @empty {
                <p>Nenhum horário cadastrado. Todos os canais ficam fechados até que seus horários sejam definidos e habilitados.</p>
              }
              <p>{{ horarios().length }} de 84 horários cadastrados.</p>
              <button
                type="button"
                (click)="adicionar()"
                [disabled]="bloqueado || ocupado() || reconsultaObrigatoria() || horarios().length >= 84"
              >Adicionar horário</button>
              <p>Para salvar, confirme sua identidade no formulário acima. A confirmação vale por cinco minutos.</p>
              <button [disabled]="bloqueado || ocupado() || reconsultaObrigatoria()">Salvar funcionamento</button>
            </form>
          }
        </div>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    section {
      margin-top: 1.5rem;
      border-top: 1px solid #6b7a70;
    }
    h5 {
      font-size: 1rem;
    }
    h5,
    p,
    small {
      overflow-wrap: anywhere;
    }
    form {
      display: grid;
      gap: 0.75rem;
      max-width: 32rem;
    }
    fieldset {
      min-width: 0;
      margin: 0;
      padding: 0.75rem;
      border: 1px solid #6b7a70;
      border-radius: 0.5rem;
    }
    .horario {
      display: grid;
      gap: 0.5rem;
    }
    input:not([type='checkbox']),
    select {
      box-sizing: border-box;
      width: 100%;
      min-width: 0;
      min-height: 48px;
      font: inherit;
      padding: 0.5rem;
    }
    .canal {
      display: flex;
      align-items: center;
      min-height: 48px;
      gap: 0.5rem;
    }
    input[type='checkbox'] {
      width: 22px;
      height: 22px;
    }
    button {
      min-height: 48px;
      max-width: 100%;
      white-space: normal;
      overflow-wrap: anywhere;
    }
    .erro {
      color: #9d2424;
    }
  `,
})
export class FuncionamentoUnidadeComponent {
  @Input({ required: true }) unidadeId = '';
  @Input() nome = '';
  @Input() bloqueado = false;
  @Output() readonly bloqueio = new EventEmitter<boolean>();
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;

  private readonly sessao = inject(SessaoService);
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
    this.aberto.set(true);
    const geracao = ++this.geracao;
    const unidade = this.unidadeId;
    this.iniciar();
    try {
      const dados = await this.sessao.api<Funcionamento>(this.rota(unidade));
      if (!this.vigente(geracao, unidade)) return;
      this.receber(dados, unidade);
      this.aviso.set('Funcionamento consultado no servidor. O rascunho usa a versão atual.');
    } catch (error) {
      if (this.vigente(geracao, unidade)) this.falhar(error, false);
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
  }

  remover(chave: number): void {
    if (!this.podeEditar()) return;
    this.horarios.update((horarios) => horarios.filter((horario) => horario.chave !== chave));
    this.aviso.set('');
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
