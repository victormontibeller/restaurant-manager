import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { Pedido } from '../pedidos/modelos';
import { PedidoDetalheComponent } from '../pedidos/pedido-detalhe.component';
import { mensagemErro } from '../catalogo/modelos';
import { HlmButton } from '../ui/button';

@Component({
  selector: 'app-pagina-pedido',
  imports: [RouterLink, PedidoDetalheComponent, HlmButton],
  templateUrl: './pagina-pedido.component.html',
  styleUrl: './pagina-pedido.component.css',
})
export class PaginaPedidoComponent {
  private readonly sessao = inject(SessaoService);
  private readonly rota = inject(ActivatedRoute);
  readonly pedido = signal<Pedido | null>(null);
  readonly erro = signal('');
  readonly carregando = signal(false);
  private contaAtual = this.sessao.identidade()?.usuarioId ?? '';
  private destruido = false;
  private geracao = 0;
  private pedidoId = '';
  private timer?: ReturnType<typeof setTimeout>;
  constructor() {
    effect(() => {
      const conta = this.sessao.identidade()?.usuarioId ?? '';
      if (conta === this.contaAtual) return;
      this.contaAtual = conta;
      this.geracao++;
      clearTimeout(this.timer);
      this.pedido.set(null);
      this.erro.set('');
      this.carregando.set(false);
      if (conta) void this.carregar();
    });
    const parametros = this.rota.paramMap.subscribe((params) => {
      this.geracao++;
      this.pedidoId = params.get('id') ?? '';
      clearTimeout(this.timer);
      this.pedido.set(null);
      this.erro.set('');
      this.carregando.set(false);
      void this.carregar();
    });
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.geracao++;
      parametros.unsubscribe();
      clearTimeout(this.timer);
    });
  }
  async carregar(): Promise<void> {
    if (this.carregando() || this.destruido) return;
    const geracao = this.geracao;
    const pedidoId = this.pedidoId;
    clearTimeout(this.timer);
    this.carregando.set(true);
    try {
      const pedido = await this.sessao.api<Pedido>(
        '/api/v1/me/pedidos/' + encodeURIComponent(pedidoId),
      );
      if (!this.destruido && geracao === this.geracao) {
        this.pedido.set(pedido);
        this.erro.set('');
      }
    } catch (error) {
      if (!this.destruido && geracao === this.geracao) {
        this.erro.set(mensagemErro(error));
        if (error instanceof ApiFailure && [401, 403, 404].includes(error.status))
          this.pedido.set(null);
      }
    } finally {
      if (!this.destruido && geracao === this.geracao) {
        this.carregando.set(false);
        this.timer = setTimeout(() => void this.carregar(), 5000);
      }
    }
  }
}
