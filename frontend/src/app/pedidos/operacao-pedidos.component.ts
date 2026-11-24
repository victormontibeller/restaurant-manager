import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { Unidade, mensagemErro } from '../catalogo/modelos';
import { CozinhaComponent } from '../cozinha/cozinha.component';
import { AcompanhamentoEventos } from '../eventos/acompanhamento';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { MesasComponent } from '../mesas/mesas.component';
import { PrazosAceiteComponent } from '../unidades/prazos-aceite.component';
import { AcessosOperacao, PaginaPedidos, Pedido } from './modelos';
import { PedidoComandoService } from './pedido-comando.service';
import { PedidoDetalheComponent } from './pedido-detalhe.component';

@Component({
  selector: 'app-operacao-pedidos',
  imports: [PedidoDetalheComponent, MesasComponent, CozinhaComponent, PrazosAceiteComponent],
  templateUrl: './operacao-pedidos.component.html',
  styleUrls: ['../operacao.css', './operacao-pedidos.component.css'],
})
export class OperacaoPedidosComponent {
  readonly unidadeExterna = input<string | undefined>(undefined);
  readonly acoesExternas = input<string[] | undefined>(undefined);
  readonly administradorExterno = input(false);
  readonly navegacaoInterna = input(true);
  readonly filaCompacta = input(false);
  readonly areaInicial = input<'pedidos' | 'cozinha' | 'mesas' | 'prazos'>('pedidos');
  private readonly sessao = inject(SessaoService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly comandos = inject(PedidoComandoService);
  readonly acoes = signal<string[]>([]);
  readonly unidades = signal<Unidade[]>([]);
  readonly administrador = signal(false);
  readonly unidadeId = signal('');
  readonly area = signal<'pedidos' | 'cozinha' | 'mesas' | 'prazos'>('pedidos');
  readonly pedidos = signal<Pedido[]>([]);
  readonly pagina = signal(0);
  readonly mais = signal(false);
  readonly ocupado = signal(false);
  readonly carregandoAcessos = signal(false);
  readonly erro = signal('');
  readonly erroRecuperacao = signal('');
  readonly avisoRecuperacao = signal('');
  readonly online = signal(navigator.onLine);
  readonly pendenciasForaDaPagina = computed(() => {
    const visiveis = new Set(this.pedidos().map((pedido) => pedido.id));
    return this.comandos.pendenciasDaFila(this.unidadeId()).filter((id) => !visiveis.has(id));
  });
  readonly atalhosEstado = [
    { valor: 'AGUARDANDO_ACEITE,NA_FILA,EM_PREPARO,PRONTO', nome: 'Em andamento' },
    { valor: 'AGUARDANDO_ACEITE', nome: 'Aguardam aceite' },
    { valor: 'NA_FILA', nome: 'Na fila' },
    { valor: 'EM_PREPARO', nome: 'Em preparo' },
    { valor: 'PRONTO', nome: 'Prontos' },
    { valor: '', nome: 'Todos' },
  ];
  readonly filtroEstado = signal(this.atalhosEstado[0].valor);
  readonly filtroCanal = signal('');
  readonly ordenacao = signal<'ANTIGOS' | 'RECENTES'>('RECENTES');
  readonly acompanhamento = new AcompanhamentoEventos();
  private geracao = 0;
  private carregamento: Promise<void> | null = null;
  private destruido = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const rede = () => this.online.set(navigator.onLine);
    window.addEventListener('online', rede);
    window.addEventListener('offline', rede);
    effect(() => {
      const unidade = this.unidadeExterna();
      const acoes = this.acoesExternas();
      const administrador = this.administradorExterno();
      const area = this.areaInicial();
      untracked(() => {
        if (unidade !== undefined) {
          clearTimeout(this.timer);
          this.acoes.set(acoes ?? []);
          this.administrador.set(administrador);
          if (this.area() !== area) this.selecionarArea(area);
          const permitida = acoes?.includes('pedido.consultar') ? unidade : '';
          if (this.unidadeId() !== permitida) this.selecionarUnidade(permitida);
        } else {
          void this.carregarAcessos();
        }
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.geracao++;
      clearTimeout(this.timer);
      this.acompanhamento.encerrar();
      window.removeEventListener('online', rede);
      window.removeEventListener('offline', rede);
    });
  }

  tem(acao: string): boolean {
    return this.acoes().includes(acao);
  }

  async carregarAcessos(): Promise<void> {
    if (this.destruido || this.carregandoAcessos() || this.unidadeExterna() !== undefined) return;
    clearTimeout(this.timer);
    this.carregandoAcessos.set(true);
    try {
      const acessos = await this.sessao.api<AcessosOperacao>('/api/v1/acessos/efetivos');
      const unidades = await this.sessao.api<Unidade[]>('/api/v1/operacao/unidades-existentes');
      if (this.destruido) return;
      this.acoes.set(acessos.acoes);
      this.administrador.set(acessos.perfil === 'ADMINISTRADOR');
      this.unidades.set(unidades);
      if (
        !this.tem('pedido.consultar') ||
        !unidades.some((unidade) => unidade.id === this.unidadeId())
      )
        this.selecionarUnidade('');
      if (
        this.area() === 'cozinha' &&
        !this.tem('cozinha.iniciar') &&
        !this.tem('cozinha.concluir')
      )
        this.selecionarArea('pedidos');
      if (this.area() === 'prazos' && !this.administrador()) this.selecionarArea('pedidos');
    } catch (error) {
      if (this.destruido) return;
      this.erro.set(mensagemErro(error));
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status)) {
        this.acoes.set([]);
        this.unidades.set([]);
        this.selecionarUnidade('');
      }
    } finally {
      if (!this.destruido) {
        this.carregandoAcessos.set(false);
        this.timer = setTimeout(() => void this.carregarAcessos(), 5000);
      }
    }
  }

  selecionarUnidade(id: string): void {
    this.geracao++;
    this.carregamento = null;
    this.unidadeId.set(id);
    this.pedidos.set([]);
    this.pagina.set(0);
    this.erroRecuperacao.set('');
    this.avisoRecuperacao.set('');
    this.ocupado.set(false);
    this.acompanhamento.encerrar();
    if (id && this.area() === 'pedidos') this.acompanhar();
  }

  selecionarArea(area: 'pedidos' | 'cozinha' | 'mesas' | 'prazos'): void {
    this.geracao++;
    this.carregamento = null;
    this.area.set(area);
    this.pedidos.set([]);
    this.pagina.set(0);
    this.ocupado.set(false);
    this.acompanhamento.encerrar();
    if (area === 'pedidos' && this.unidadeId()) this.acompanhar();
  }

  filtrar(campo: 'estado' | 'canal' | 'ordem', valor: string): void {
    if (campo === 'estado') this.filtroEstado.set(valor);
    if (campo === 'canal') this.filtroCanal.set(valor);
    if (campo === 'ordem') this.ordenacao.set(valor === 'RECENTES' ? 'RECENTES' : 'ANTIGOS');
    this.geracao++;
    this.carregamento = null;
    this.pagina.set(0);
    this.mais.set(false);
    this.pedidos.set([]);
    void this.carregarPedidos(0);
  }

  async recuperar(id: string): Promise<void> {
    const intencao = this.comandos.pendente(id, false);
    if (!intencao || !this.online() || this.comandos.ocupado()) return;
    const geracao = this.geracao;
    this.erroRecuperacao.set('');
    this.avisoRecuperacao.set('');
    try {
      await this.comandos.executar(id, false, intencao);
      if (geracao === this.geracao) this.avisoRecuperacao.set('Resultado recuperado.');
    } catch (erro) {
      if (geracao === this.geracao) this.erroRecuperacao.set(mensagemErro(erro));
    } finally {
      if (geracao === this.geracao) await this.carregarPedidos(this.pagina());
    }
  }

  private acompanhar(): void {
    this.acompanhamento.iniciar(
      this.sessao,
      '/api/v1/eventos',
      { unidadeId: this.unidadeId() },
      () => this.carregarPedidos(this.pagina(), true),
      () => {
        this.pedidos.set([]);
        this.acoes.set([]);
      },
    );
  }

  async carregarPedidos(pagina: number, automatica = false): Promise<void> {
    if (pagina < 0 || !this.unidadeId() || this.destruido) return;
    const geracao = this.geracao;
    while (this.carregamento) {
      if (!automatica) return;
      await this.carregamento.catch(() => undefined);
      if (geracao !== this.geracao || this.destruido) return;
    }
    const carregamento = this.consultarPedidos(automatica ? this.pagina() : pagina, automatica);
    this.carregamento = carregamento;
    try {
      await carregamento;
    } finally {
      if (this.carregamento === carregamento) this.carregamento = null;
    }
  }

  private async consultarPedidos(pagina: number, automatica: boolean): Promise<void> {
    const geracao = this.geracao;
    this.ocupado.set(true);
    try {
      const resultado = await this.sessao.api<PaginaPedidos>(
        '/api/v1/operacao/pedidos?' +
          new URLSearchParams({
            unidadeId: this.unidadeId(),
            pagina: String(pagina),
            ...(this.filtroEstado() ? { estados: this.filtroEstado() } : {}),
            ...(this.filtroCanal() ? { canal: this.filtroCanal() } : {}),
            ordenacao: this.ordenacao(),
          }),
      );
      if (geracao !== this.geracao || this.destruido) return;
      const linhaFocada =
        this.filaCompacta() && document.activeElement?.closest('app-pedido-detalhe');
      if (linhaFocada && this.elemento.nativeElement.contains(linhaFocada)) {
        afterNextRender(
          () => {
            if (document.activeElement !== document.body) return;
            const destino = linhaFocada.isConnected
              ? linhaFocada.querySelector<HTMLElement>('.alternar-detalhes')
              : this.elemento.nativeElement.querySelector<HTMLElement>('.atualizar-fila');
            destino?.focus();
          },
          { injector: this.injector },
        );
      }
      this.pedidos.set(resultado.itens);
      this.pagina.set(pagina);
      this.mais.set(resultado.mais);
      this.erro.set('');
    } catch (error) {
      if (geracao !== this.geracao || this.destruido) return;
      this.erro.set(mensagemErro(error));
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status))
        this.pedidos.set([]);
      if (automatica) throw error;
    } finally {
      if (geracao === this.geracao && !this.destruido) this.ocupado.set(false);
    }
  }
}
