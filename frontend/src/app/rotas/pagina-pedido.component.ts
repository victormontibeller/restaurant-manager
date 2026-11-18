import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { Pedido } from '../pedidos/modelos';
import { PedidoDetalheComponent } from '../pedidos/pedido-detalhe.component';
import { mensagemErro } from '../catalogo/modelos';
import { HlmButton } from '../ui/button';
import { IconeComponent } from './icone.component';
import { MarcaService } from './marca.service';

@Component({
  selector: 'app-pagina-pedido',
  imports: [RouterLink, PedidoDetalheComponent, HlmButton, IconeComponent],
  template: `
    <section class="pagina-pedido-shell">
      <nav class="pagina-pedido-voltar" aria-label="Navegação de retorno">
        <a hlmBtn variant="ghost" size="sm" class="link-voltar-pedidos" routerLink="/pedidos"
          >← Meus pedidos</a
        >
      </nav>

      <header class="cabecalho-painel">
        <div>
          <span class="sobretitulo">{{ marca.nome() }} · Acompanhamento</span>
          <h1>Acompanhe seu pedido</h1>
          <p class="texto-secundario">
            Veja em que etapa está o preparo, confira os itens enviados e acompanhe pagamentos ou
            ajustes em tempo real.
          </p>
        </div>
      </header>

      <div class="barra-conexao">
        <span class="barra-conexao-status" role="status">
          <app-icone nome="pedidos" />
          @if (carregando()) {
            Atualizando situação do pedido…
          } @else if (pedido()) {
            Comanda sincronizada com a casa.
          } @else {
            Pronto para consultar seu pedido.
          }
        </span>
        <button
          hlmBtn
          variant="outline"
          size="sm"
          type="button"
          (click)="carregar()"
          [disabled]="carregando()"
        >
          Atualizar pedido
        </button>
      </div>

      @if (erro()) {
        <p role="alert" class="erro">{{ erro() }}</p>
      }

      @if (pedido(); as atual) {
        <app-pedido-detalhe [pedido]="atual" contexto="cliente" (atualizar)="carregar()" />
      } @else if (carregando()) {
        <div class="pedido-carregando" role="status">
          <span class="pedido-carregando-icone" aria-hidden="true">
            <app-icone nome="pedidos" />
          </span>
          <p>Buscando seu pedido…</p>
        </div>
      }
    </section>
  `,
  styles: `
    .pagina-pedido-shell {
      width: 100%;
      max-width: 1080px;
      margin: 0 auto;
      padding-top: 1rem;
      display: grid;
      gap: 1rem;
    }

    .pagina-pedido-voltar {
      display: flex;
      align-items: center;
    }

    .link-voltar-pedidos {
      min-height: 48px;
      padding: 0 0.85rem 0 0.5rem;
      color: var(--secondary-foreground, #44372e);
      font-weight: 650;
    }

    .cabecalho-painel {
      display: grid;
      gap: 0.35rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border, #e5ded3);
    }

    .sobretitulo {
      display: block;
      font-size: 0.72rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.14em;
      color: var(--primary-ink, #a53e2b);
    }

    h1 {
      margin: 0.3rem 0 0.35rem;
      font-family: var(--font-serif, Georgia, 'Times New Roman', serif);
      font-size: clamp(1.75rem, 3.2vw, 2.35rem);
      line-height: 1.12;
      letter-spacing: -0.025em;
      color: var(--foreground, #292521);
    }

    .texto-secundario {
      margin: 0;
      font-size: 0.94rem;
      line-height: 1.5;
      color: var(--muted-foreground, #6e6259);
      max-width: 62ch;
    }

    .barra-conexao {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem 1rem;
      padding: 0.75rem 1rem;
      border-radius: 1rem;
      border: 1px solid var(--border, #e5ded3);
      background: var(--card, #ffffff);
      box-shadow: 0 2px 10px -4px rgb(41 37 33 / 6%);
    }

    .barra-conexao-status {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--secondary-foreground, #44372e);
      min-width: 0;
    }

    .barra-conexao-status app-icone {
      color: var(--primary-ink, #a53e2b);
    }

    .erro {
      margin: 0;
      padding: 0.85rem 1rem;
      border-radius: 0.9rem;
      background: var(--danger-bg, #fae9e6);
      border: 1px solid var(--danger-border, #ecc6bf);
      color: var(--danger-fg, #9c2323);
      font-size: 0.92rem;
      font-weight: 600;
    }

    .pedido-carregando {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 1.15rem 1.25rem;
      border-radius: 1.1rem;
      border: 1px solid var(--border, #e5ded3);
      background: var(--card, #ffffff);
      color: var(--secondary-foreground, #44372e);
      font-weight: 600;
    }

    .pedido-carregando p {
      margin: 0;
    }

    .pedido-carregando-icone {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      background: var(--secondary, #f0ebe3);
      color: var(--primary-ink, #a53e2b);
      flex: none;
    }

    @media (max-width: 600px) {
      .pagina-pedido-shell {
        padding-top: 0.5rem;
      }

      .barra-conexao {
        flex-direction: column;
        align-items: stretch;
      }

      .barra-conexao button {
        width: 100%;
      }
    }
  `,
})
export class PaginaPedidoComponent {
  readonly marca = inject(MarcaService);
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
