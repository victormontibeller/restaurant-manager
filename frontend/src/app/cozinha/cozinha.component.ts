import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { mensagemErro } from '../catalogo/modelos';
import { AcompanhamentoEventos } from '../eventos/acompanhamento';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { PaginaPedidos, Pedido } from '../pedidos/modelos';
import { PedidoDetalheComponent } from '../pedidos/pedido-detalhe.component';

@Component({
  selector: 'app-cozinha',
  imports: [PedidoDetalheComponent],
  templateUrl: './cozinha.component.html',
  styleUrl: '../operacao.css',
})
export class CozinhaComponent {
  readonly unidadeId = input.required<string>();
  readonly acoes = input<string[]>([]);
  private readonly sessao = inject(SessaoService);
  readonly acompanhamento = new AcompanhamentoEventos();
  readonly pedidos = signal<Pedido[]>([]);
  readonly erro = signal('');
  readonly ocupado = signal(false);
  readonly pagina = signal(0);
  readonly mais = signal(false);
  private geracao = 0;
  private carregamento: Promise<void> | null = null;

  constructor() {
    effect(() => {
      const unidade = this.unidadeId();
      this.geracao++;
      this.carregamento = null;
      this.pedidos.set([]);
      this.ocupado.set(false);
      this.pagina.set(0);
      untracked(() =>
        this.acompanhamento.iniciar(
          this.sessao,
          '/api/v1/eventos',
          { unidadeId: unidade },
          () => this.carregar(true),
          () => this.pedidos.set([]),
        ),
      );
    });
    inject(DestroyRef).onDestroy(() => {
      this.geracao++;
      this.acompanhamento.encerrar();
    });
  }

  async carregar(automatica = false): Promise<void> {
    const geracao = this.geracao;
    while (this.carregamento) {
      if (!automatica) return;
      await this.carregamento.catch(() => undefined);
      if (geracao !== this.geracao) return;
    }
    const carregamento = this.consultar(automatica);
    this.carregamento = carregamento;
    try {
      await carregamento;
    } finally {
      if (this.carregamento === carregamento) this.carregamento = null;
    }
  }

  private async consultar(automatica: boolean): Promise<void> {
    const geracao = this.geracao;
    this.ocupado.set(true);
    try {
      const resultado = await this.sessao.api<PaginaPedidos>(
        '/api/v1/cozinha?' +
          new URLSearchParams({ unidadeId: this.unidadeId(), pagina: String(this.pagina()) }),
      );
      if (geracao !== this.geracao) return;
      this.pedidos.set(resultado.itens);
      this.mais.set(resultado.mais);
      this.erro.set('');
    } catch (error) {
      if (geracao !== this.geracao) return;
      this.erro.set(mensagemErro(error));
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status))
        this.pedidos.set([]);
      if (automatica) throw error;
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }

  async navegar(pagina: number): Promise<void> {
    if (pagina < 0 || this.ocupado()) return;
    const anterior = this.pagina();
    this.pagina.set(pagina);
    try {
      await this.carregar(true);
    } catch {
      this.pagina.set(anterior);
    }
  }
}
