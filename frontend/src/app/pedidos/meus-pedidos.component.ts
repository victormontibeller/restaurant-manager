import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { SessaoMesaService } from '../mesas/sessao-mesa.service';
import { mensagemErro } from '../catalogo/modelos';
import { AcompanhamentoEventos } from '../eventos/acompanhamento';
import { PaginaPedidos, Pedido } from './modelos';
import { PedidoDetalheComponent } from './pedido-detalhe.component';
import { PedidoEnvioService } from './pedido-envio.service';

@Component({
  selector: 'app-meus-pedidos',
  imports: [PedidoDetalheComponent],
  templateUrl: './meus-pedidos.component.html',
  styleUrl: '../operacao.css',
})
export class MeusPedidosComponent {
  readonly mesa = input(false);
  private readonly sessao = inject(SessaoService);
  private readonly sessaoMesa = inject(SessaoMesaService);
  private readonly envio = inject(PedidoEnvioService);
  readonly pedidos = signal<Pedido[]>([]);
  readonly pagina = signal(0);
  readonly mais = signal(false);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly outrasUnidades = signal(false);
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
