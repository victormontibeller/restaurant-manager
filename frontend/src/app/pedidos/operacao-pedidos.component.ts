import { Component, DestroyRef, inject, signal } from '@angular/core';
import { Unidade, mensagemErro } from '../catalogo/modelos';
import { CozinhaComponent } from '../cozinha/cozinha.component';
import { AcompanhamentoEventos } from '../eventos/acompanhamento';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { MesasComponent } from '../mesas/mesas.component';
import { PrazosAceiteComponent } from '../unidades/prazos-aceite.component';
import { AcessosOperacao, PaginaPedidos, Pedido } from './modelos';
import { PedidoDetalheComponent } from './pedido-detalhe.component';

@Component({
  selector: 'app-operacao-pedidos',
  imports: [PedidoDetalheComponent, MesasComponent, CozinhaComponent, PrazosAceiteComponent],
  templateUrl: './operacao-pedidos.component.html',
  styleUrl: '../operacao.css',
})
export class OperacaoPedidosComponent {
  private readonly sessao = inject(SessaoService);
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
  readonly acompanhamento = new AcompanhamentoEventos();
  private geracao = 0;
  private carregamento: Promise<void> | null = null;
  private destruido = false;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    void this.carregarAcessos();
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.geracao++;
      clearTimeout(this.timer);
      this.acompanhamento.encerrar();
    });
  }

  tem(acao: string): boolean {
    return this.acoes().includes(acao);
  }

  async carregarAcessos(): Promise<void> {
    if (this.destruido || this.carregandoAcessos()) return;
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
    this.ocupado.set(false);
    this.acompanhamento.encerrar();
    if (id && this.area() === 'pedidos') this.acompanhar();
  }

  selecionarArea(area: 'pedidos' | 'cozinha' | 'mesas' | 'prazos'): void {
    this.geracao++;
    this.carregamento = null;
    this.area.set(area);
    this.pedidos.set([]);
    this.ocupado.set(false);
    this.acompanhamento.encerrar();
    if (area === 'pedidos' && this.unidadeId()) this.acompanhar();
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
          new URLSearchParams({ unidadeId: this.unidadeId(), pagina: String(pagina) }),
      );
      if (geracao !== this.geracao || this.destruido) return;
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
