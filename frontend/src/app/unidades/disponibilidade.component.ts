import { Component, OnDestroy, OnInit, signal } from '@angular/core';

type Canal = 'DELIVERY' | 'RETIRADA' | 'MESA';

interface UnidadePublica {
  id: string;
  nome: string;
  fuso: string;
}

interface HorarioPublico {
  canal: Canal;
  diaSemana: number;
  inicio: string;
  fim: string;
}

interface FuncionamentoPublico {
  unidadeId: string;
  nome: string;
  fuso: string;
  consultadoEm: string;
  canais: { canal: Canal; habilitado: boolean; aberto: boolean }[];
  horarios: HorarioPublico[];
}

@Component({
  selector: 'app-disponibilidade',
  template: `
    <section aria-labelledby="disponibilidade-titulo" [attr.aria-busy]="carregando()">
      <h2 id="disponibilidade-titulo">Unidades e horários</h2>
      <p>Escolha a unidade para consultar os canais e horários de atendimento.</p>
      <button type="button" (click)="carregar()" [disabled]="carregandoLista()">Atualizar lista de unidades</button>
      <label for="unidade-publica">Unidade</label>
      <select
        id="unidade-publica"
        #seletor
        [value]="selecionada()"
        [disabled]="carregandoLista()"
        (change)="selecionar(seletor.value)"
      >
        <option value="">Selecione uma unidade</option>
        @for (unidade of unidades(); track unidade.id) {
          <option [value]="unidade.id">{{ unidade.nome }}</option>
        }
      </select>
      <button type="button" (click)="selecionar(selecionada())" [disabled]="!selecionada() || carregando()">Atualizar horários</button>
      <p role="status">{{ estado() }}</p>
      @if (erro()) {
        <p role="alert" class="erro">{{ erro() }}</p>
      }
      @if (atual(); as unidade) {
        <h3>{{ unidade.nome }}</h3>
        <p>Fuso da unidade: {{ unidade.fuso }}. Consulta confirmada: {{ confirmado() }}.</p>
        <p>A situação corresponde ao horário consultado. Esta versão ainda não recebe pedidos.</p>
        <div class="canais">
          @for (canal of unidade.canais; track canal.canal) {
            <article>
              <h4>{{ nomeCanal(canal.canal) }}</h4>
              <p><strong>{{ !canal.habilitado ? 'Canal desabilitado' : canal.aberto ? 'Aberto no horário consultado' : 'Fechado no horário consultado' }}</strong></p>
              @if (canal.habilitado) {
                <ul [attr.aria-label]="'Horários de ' + nomeCanal(canal.canal)">
                  @for (horario of horariosDo(canal.canal); track $index) {
                    <li>{{ nomeDia(horario.diaSemana) }}: {{ horario.inicio }} às {{ horario.fim }}{{ madrugada(horario) ? ' do dia seguinte' : '' }}</li>
                  } @empty {
                    <li>Sem horários configurados; atendimento fechado.</li>
                  }
                </ul>
              }
            </article>
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
    label,
    select {
      display: block;
      margin-top: 0.8rem;
    }
    select {
      width: 100%;
      max-width: 32rem;
      min-height: 48px;
      font: inherit;
      margin-bottom: 0.8rem;
    }
    .canais {
      display: grid;
      gap: 1rem;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
    }
    article {
      border: 1px solid #6b7a70;
      border-radius: 0.5rem;
      padding: 1rem;
      min-width: 0;
    }
    h4 {
      margin-top: 0;
    }
    ul {
      padding-left: 1.2rem;
    }
    p,
    h3,
    li,
    button {
      overflow-wrap: anywhere;
    }
    button {
      max-width: 100%;
      white-space: normal;
    }
    .erro {
      color: #9d2424;
    }
  `,
})
export class DisponibilidadeComponent implements OnInit, OnDestroy {
  readonly unidades = signal<UnidadePublica[]>([]);
  readonly selecionada = signal('');
  readonly atual = signal<FuncionamentoPublico | null>(null);
  readonly confirmado = signal('');
  readonly carregando = signal(false);
  readonly carregandoLista = signal(false);
  readonly estado = signal('Carregando unidades…');
  readonly erro = signal('');
  private geracao = 0;
  private destruido = false;
  private requisicao?: AbortController;
  private timer?: ReturnType<typeof setTimeout>;
  private expiraEm = 0;

  private readonly desconectar = (): void => {
    this.limpar();
    this.estado.set('Sem conexão. Atualize os horários quando a conexão voltar.');
  };

  private readonly conferirValidade = (): void => {
    if (this.atual() && Date.now() >= this.expiraEm) this.expirar();
  };

  ngOnInit(): void {
    window.addEventListener('offline', this.desconectar);
    window.addEventListener('focus', this.conferirValidade);
    document.addEventListener('visibilitychange', this.conferirValidade);
    void this.carregar();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.limpar();
    window.removeEventListener('offline', this.desconectar);
    window.removeEventListener('focus', this.conferirValidade);
    document.removeEventListener('visibilitychange', this.conferirValidade);
  }

  async carregar(): Promise<void> {
    const geracao = this.limpar();
    this.unidades.set([]);
    this.selecionada.set('');
    this.carregandoLista.set(true);
    this.carregando.set(true);
    this.estado.set('Carregando unidades…');
    try {
      const unidades = await this.consultar<UnidadePublica[]>('/api/v1/unidades');
      if (!this.vigente(geracao)) return;
      if (!Array.isArray(unidades)) throw new Error('Resposta inválida.');
      this.unidades.set(unidades);
      this.estado.set(
        unidades.length ? 'Selecione uma unidade.' : 'Nenhuma unidade disponível no momento.',
      );
    } catch {
      if (!this.vigente(geracao)) return;
      this.estado.set('Consulta de unidades indisponível.');
      this.erro.set(
        'Não foi possível consultar as unidades. Verifique a conexão e tente novamente.',
      );
    } finally {
      if (this.vigente(geracao)) {
        this.carregandoLista.set(false);
        this.carregando.set(false);
      }
    }
  }

  async selecionar(id: string): Promise<void> {
    const geracao = this.limpar();
    const unidade = this.unidades().find((item) => item.id === id);
    this.selecionada.set(unidade ? id : '');
    if (!unidade) {
      this.estado.set('Selecione uma unidade.');
      return;
    }
    this.carregando.set(true);
    this.estado.set('Consultando horários…');
    try {
      const atual = await this.consultar<FuncionamentoPublico>(
        '/api/v1/unidades/' + encodeURIComponent(id) + '/funcionamento',
      );
      if (!this.vigente(geracao)) return;
      if (atual.unidadeId !== id || !Array.isArray(atual.canais) || !Array.isArray(atual.horarios))
        throw new Error('Resposta inválida.');
      const confirmado = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: atual.fuso,
      }).format(new Date(atual.consultadoEm));
      this.atual.set(atual);
      this.confirmado.set(confirmado);
      this.estado.set('Horários consultados. Atualize para conferir mudanças.');
      this.expiraEm = Date.now() + 60000;
      this.timer = setTimeout(() => this.expirar(), 60000);
    } catch {
      if (!this.vigente(geracao)) return;
      this.estado.set('Horários indisponíveis para consulta.');
      this.erro.set(
        'Não foi possível consultar esta unidade. Verifique a conexão ou recarregue as unidades disponíveis.',
      );
    } finally {
      if (this.vigente(geracao)) this.carregando.set(false);
    }
  }

  nomeCanal(canal: Canal): string {
    return { DELIVERY: 'Delivery', RETIRADA: 'Retirada', MESA: 'Mesa' }[canal];
  }

  nomeDia(dia: number): string {
    return [
      'Segunda-feira',
      'Terça-feira',
      'Quarta-feira',
      'Quinta-feira',
      'Sexta-feira',
      'Sábado',
      'Domingo',
    ][dia - 1];
  }

  horariosDo(canal: Canal): HorarioPublico[] {
    return this.atual()?.horarios.filter((horario) => horario.canal === canal) ?? [];
  }

  madrugada(horario: HorarioPublico): boolean {
    return horario.fim < horario.inicio;
  }

  private vigente(geracao: number): boolean {
    return !this.destruido && geracao === this.geracao;
  }

  private limpar(): number {
    this.geracao++;
    this.requisicao?.abort();
    clearTimeout(this.timer);
    this.atual.set(null);
    this.confirmado.set('');
    this.erro.set('');
    this.carregando.set(false);
    this.carregandoLista.set(false);
    return this.geracao;
  }

  private expirar(): void {
    if (this.destruido) return;
    this.limpar();
    this.estado.set('Consulta desatualizada. Atualize os horários para consultar novamente.');
  }

  private async consultar<T>(url: string): Promise<T> {
    this.requisicao = new AbortController();
    const response = await fetch(url, {
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.any([this.requisicao.signal, AbortSignal.timeout(8000)]),
    });
    if (!response.ok) throw new Error('Consulta indisponível.');
    return response.json() as Promise<T>;
  }
}
