import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { SessaoMesaService } from '../mesas/sessao-mesa.service';
import { CatalogoMidiaService } from '../catalogo/catalogo-midia.service';
import { mensagemErro } from '../catalogo/modelos';
import { AcompanhamentoEventos } from '../eventos/acompanhamento';
import { IconeComponent } from '../rotas/icone.component';
import { MarcaService } from '../rotas/marca.service';
import { HlmButton } from '../ui/button';
import {
  LinhaPedido,
  PaginaPedidos,
  Pedido,
  inicialProduto,
  nomeEstado,
  resolverMidiaLinha,
} from './modelos';
import { PedidoDetalheComponent } from './pedido-detalhe.component';
import { PedidoEnvioService } from './pedido-envio.service';

@Component({
  selector: 'app-meus-pedidos',
  imports: [PedidoDetalheComponent, RouterLink, HlmButton, IconeComponent],
  templateUrl: './meus-pedidos.component.html',
  styleUrl: '../operacao.css',
})
export class MeusPedidosComponent {
  readonly mesa = input(false);
  private readonly sessao = inject(SessaoService);
  private readonly sessaoMesa = inject(SessaoMesaService);
  private readonly envio = inject(PedidoEnvioService);
  private readonly catalogoMidia = inject(CatalogoMidiaService, { optional: true });
  private readonly marca = inject(MarcaService);
  readonly pedidos = signal<Pedido[]>([]);
  readonly filtro = signal<'todos' | 'andamento' | 'concluidos'>('todos');
  readonly pagina = signal(0);
  readonly mais = signal(false);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly outrasUnidades = signal(false);
  private readonly midiasComErro = signal<Record<string, boolean>>({});

  nomeEstado(estado: string): string {
    return nomeEstado(estado);
  }

  canalRotulo(canal: Pedido['canal']): string {
    return { MESA: 'Mesa', RETIRADA: 'Retirada', DELIVERY: 'Delivery' }[canal] ?? canal;
  }

  horaPedido(criadoEm: string): string {
    const ts = Date.parse(criadoEm);
    if (!Number.isFinite(ts)) return '';
    return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  linhasVisiveis(pedido: Pedido): LinhaPedido[] {
    return (pedido.linhas ?? []).slice(0, 2);
  }

  linhasRestantes(pedido: Pedido): number {
    return Math.max(0, (pedido.linhas ?? []).length - 2);
  }

  totalUnidades(pedido: Pedido): number {
    return (pedido.linhas ?? []).reduce((acc, item) => acc + item.quantidade, 0);
  }

  midiaLinha(linha: LinhaPedido): string | null {
    return resolverMidiaLinha(
      linha,
      (produtoId) => this.catalogoMidia?.midiaDoProduto?.(produtoId) ?? null,
      this.midiasComErro(),
    );
  }

  registrarErroMidia(midiaId: string): void {
    if (!this.midiasComErro()[midiaId]) {
      this.midiasComErro.update((atual) => ({ ...atual, [midiaId]: true }));
    }
  }

  inicialProduto(nome: string): string {
    return inicialProduto(nome);
  }

  cancelamentoPendente(pedido: Pedido): boolean {
    return (pedido.solicitacoes ?? []).some((s) => s.estado === 'PENDENTE');
  }

  aguardandoPagamentoOnline(pedido: Pedido): boolean {
    return !!pedido.pagoOnline && pedido.estado === 'AGUARDANDO_PAGAMENTO';
  }

  rotuloAcaoPedido(pedido: Pedido): string {
    if (this.aguardandoPagamentoOnline(pedido)) return 'Pagar e acompanhar';
    return this.emAndamento(pedido) ? 'Acompanhar pedido' : 'Ver detalhes';
  }

  varianteAcaoPedido(pedido: Pedido): 'default' | 'outline' {
    return this.emAndamento(pedido) ? 'default' : 'outline';
  }

  totalPedidoFormatado(pedido: Pedido): string {
    const valor = pedido.saldo?.totalDevido;
    if (valor && /^\d+(\.\d{1,2})?$/.test(valor)) {
      const [intPart, dec = ''] = valor.split('.');
      return `R$\u00a0${BigInt(intPart).toLocaleString('pt-BR')},${dec.padEnd(2, '0')}`;
    }
    return '';
  }
  readonly acompanhamento = new AcompanhamentoEventos();
  private geracao = 0;
  private carregamento: Promise<void> | null = null;
  private automatico: Promise<void> | null = null;
  private timerUnidades?: ReturnType<typeof setTimeout>;
  private destruido = false;
  private escopoEventos = '';

  constructor() {
    effect(() => {
      this.mesa();
      this.sessao.identidade();
      this.sessaoMesa.participante();
      this.envio.confirmado();
      this.geracao++;
      this.carregamento = null;
      this.automatico = null;
      clearTimeout(this.timerUnidades);
      this.timerUnidades = undefined;
      this.outrasUnidades.set(false);
      this.acompanhamento.encerrar();
      this.escopoEventos = '';
      this.pedidos.set([]);
      this.ocupado.set(false);
      untracked(() => void this.carregar(0));
    });
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.geracao++;
      clearTimeout(this.timerUnidades);
      this.acompanhamento.encerrar();
    });
  }

  async carregar(pagina: number, automatica = false): Promise<void> {
    if (automatica && this.automatico) return this.automatico;
    const consulta = this.carregarSerial(pagina, automatica);
    if (automatica) this.automatico = consulta;
    try {
      await consulta;
    } finally {
      if (this.automatico === consulta) this.automatico = null;
    }
  }

  private async carregarSerial(pagina: number, automatica: boolean): Promise<void> {
    if (pagina < 0 || this.destruido) return;
    const geracao = this.geracao;
    while (this.carregamento) {
      if (!automatica) return;
      await this.carregamento.catch(() => undefined);
      if (geracao !== this.geracao || this.destruido) return;
    }
    const carregamento = this.consultar(automatica ? this.pagina() : pagina, automatica);
    this.carregamento = carregamento;
    try {
      await carregamento;
    } finally {
      if (this.carregamento === carregamento) this.carregamento = null;
    }
  }

  private async consultar(pagina: number, automatica: boolean): Promise<void> {
    const geracao = this.geracao;
    const transporte = this.mesa() ? this.sessaoMesa : this.sessao;
    const rota = this.mesa() ? '/api/v1/mesa/pedidos' : '/api/v1/me/pedidos';
    this.ocupado.set(true);
    try {
      const resultado = await transporte.api<PaginaPedidos>(rota + '?pagina=' + pagina);
      if (geracao !== this.geracao || this.destruido) return;
      this.pedidos.set(resultado.itens);
      this.preaquecerMidias(resultado.itens);
      this.pagina.set(pagina);
      this.mais.set(resultado.mais);
      this.erro.set('');
      // O stream cobre uma unidade; páginas com outras unidades recebem também
      // snapshots autorizados a cada cinco segundos, sem acumular consultas.
      const unidade = this.mesa()
        ? this.sessaoMesa.participante()?.unidadeId
        : resultado.itens[0]?.unidadeId;
      if (unidade && this.escopoEventos !== unidade) {
        this.escopoEventos = unidade;
        this.acompanhamento.iniciar(
          transporte,
          this.mesa() ? '/api/v1/mesa/eventos' : '/api/v1/eventos',
          this.mesa() ? {} : { unidadeId: unidade },
          () => this.carregar(this.pagina(), true),
          () => {
            this.pedidos.set([]);
            this.erro.set('Seu acesso ao acompanhamento foi encerrado.');
          },
        );
      }
    } catch (error) {
      if (geracao !== this.geracao || this.destruido) return;
      this.erro.set(mensagemErro(error));
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status))
        this.pedidos.set([]);
      if (automatica) throw error;
    } finally {
      if (geracao === this.geracao && !this.destruido) {
        this.ocupado.set(false);
        this.agendarOutrasUnidades();
      }
    }
  }

  nomeEstabelecimento(): string {
    return typeof this.marca?.nome === 'function' ? this.marca.nome() : '';
  }

  private preaquecerMidias(pedidos: readonly Pedido[]): void {
    const porContexto = new Map<string, { unidadeId: string; canal: string; ids: string[] }>();
    for (const pedido of pedidos) {
      if (!pedido.unidadeId || !pedido.canal || !Array.isArray(pedido.linhas)) continue;
      const chave = `${pedido.unidadeId}:${pedido.canal}`;
      const grupo = porContexto.get(chave) ?? {
        unidadeId: pedido.unidadeId,
        canal: pedido.canal,
        ids: [],
      };
      for (const linha of pedido.linhas) {
        if (linha.produtoId) grupo.ids.push(linha.produtoId);
      }
      if (grupo.ids.length) porContexto.set(chave, grupo);
    }
    for (const grupo of porContexto.values()) {
      void this.catalogoMidia?.garantir?.(grupo.unidadeId, grupo.canal, grupo.ids);
    }
  }

  emAndamento(pedido: Pedido): boolean {
    return !['CONCLUIDO', 'CANCELADO'].includes(pedido.estado);
  }

  pedidosVisiveis(): Pedido[] {
    const modo = this.filtro();
    if (modo === 'andamento') return this.pedidos().filter((pedido) => this.emAndamento(pedido));
    if (modo === 'concluidos') return this.pedidos().filter((pedido) => !this.emAndamento(pedido));
    return this.pedidos();
  }

  contagem(modo: 'andamento' | 'concluidos'): number {
    return this.pedidos().filter((pedido) =>
      modo === 'andamento' ? this.emAndamento(pedido) : !this.emAndamento(pedido),
    ).length;
  }

  private agendarOutrasUnidades(): void {
    clearTimeout(this.timerUnidades);
    this.timerUnidades = undefined;
    const multiplas =
      !this.mesa() && new Set(this.pedidos().map((pedido) => pedido.unidadeId)).size > 1;
    this.outrasUnidades.set(multiplas);
    if (!multiplas || this.destruido) return;
    const geracao = this.geracao;
    this.timerUnidades = setTimeout(() => {
      if (geracao !== this.geracao || this.destruido) return;
      this.timerUnidades = undefined;
      void this.carregar(this.pagina(), true).catch(() => undefined);
    }, 5000);
  }
}
