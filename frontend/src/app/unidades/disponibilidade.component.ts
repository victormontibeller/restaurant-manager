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
  templateUrl: './disponibilidade.component.html',
  styleUrl: './disponibilidade.component.css',
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
