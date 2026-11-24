import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Injector,
  Output,
  ViewChild,
  afterNextRender,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { HlmButton } from '../ui/button';
import { CatalogoMidiaService } from '../catalogo/catalogo-midia.service';
import { CANAIS, ProdutoPublico, moeda } from '../catalogo/modelos';
import { CarrinhoService } from './carrinho.service';
import { ConfirmarPedidoComponent } from '../pedidos/confirmar-pedido.component';
import { ItemCarrinho } from './modelos';

@Component({
  selector: 'app-carrinho',
  imports: [ConfirmarPedidoComponent, HlmButton],
  template: `
    <section
      class="comanda-bistro"
      aria-label="Meu carrinho"
      [attr.aria-busy]="carrinho.ocupado()"
    >
      <header class="t-head comanda-cabecalho">
        <div>
          <p class="kicker">Seu pedido</p>
          <h2 id="carrinho-titulo">
            {{
              carrinho.itens().length
                ? quantidadeTotal() + (quantidadeTotal() === 1 ? ' item' : ' itens')
                : 'Meu carrinho'
            }}
          </h2>
        </div>
        @if (carrinho.contexto(); as contexto) {
          <span class="t-ctx comanda-contexto">
            {{ nomeCurtoUnidade(contexto.unidadeNome) }} · {{ nomeCanal(contexto.canal) }}
          </span>
        }
      </header>

      <p class="sr-only carrinho-instrucao">Confira seus itens e confirme o envio ao finalizar.</p>
      <details class="carrinho-ajuda sr-only">
        <summary>Sobre o carrinho e os valores</summary>
        <p>
          Os itens ficam nesta aba durante a navegação. Atualizar ou fechar a página descarta o
          rascunho. O resumo é validado pelo restaurante antes do envio.
        </p>
      </details>

      @if (carrinho.erro()) {
        <p role="alert" class="erro">{{ carrinho.erro() }}</p>
      }
      @if (carrinho.aviso()) {
        <p role="status" class="aviso-comanda" [class.sr-only]="!avisoImportante()">
          {{ carrinho.aviso() }}
        </p>
      }

      <div class="t-items">
        @for (item of carrinho.itens(); track item.linha.id; let indice = $index) {
          <article
            class="item t-item item-comanda"
            [attr.aria-label]="'Item ' + (indice + 1) + ': ' + item.nome"
          >
            <div
              class="item-comanda-corpo"
              [class.item-comanda-corpo--sem-imagem]="!exibirImagens"
            >
              @if (exibirImagens) {
                @if (midiaDoItem(item); as midia) {
                  <div class="item-thumb">
                    <img
                      class="item-thumb-img"
                      [src]="'/api/v1/midias/' + midia"
                      [alt]="item.nome"
                      width="52"
                      height="52"
                      loading="lazy"
                      decoding="async"
                      (error)="registrarErroMidia(midia)"
                    />
                  </div>
                } @else {
                  <div class="item-thumb item-thumb--mono" aria-hidden="true">
                    {{ inicialProduto(item.nome) }}
                  </div>
                }
              }
              <div class="item-comanda-conteudo">
                <div class="t-line item-comanda-topo">
                  <span class="t-qty item-qtd-selo" aria-hidden="true"
                    >{{ item.linha.quantidade }}×</span
                  >
                  <h3 class="t-name">{{ item.nome }}</h3>
                  @if (subtotalItem(item); as subtotal) {
                    <span class="t-price">{{ moeda(subtotal) }}</span>
                  }
                </div>
                @for (detalhe of detalhesItem(item); track $index) {
                  <p class="t-mods" aria-hidden="true">{{ detalhe }}</p>
                }
              </div>
            </div>
            <p class="sr-only item-composicao">
              Composição: {{ item.linha.escolhas.length }}
              {{ item.linha.escolhas.length === 1 ? 'escolha' : 'escolhas' }} e
              {{ item.linha.adicionais.length }}
              {{ item.linha.adicionais.length === 1 ? 'adicional' : 'adicionais' }}.
            </p>
            <div class="t-ctrl linha-contador-comanda">
              <label class="sr-only" [for]="'quantidade-' + item.linha.id"
                >Quantidade de {{ item.nome }} (item {{ indice + 1 }})</label
              >
              <div class="controle-quantidade stepper">
                <button
                  class="btn-passo"
                  type="button"
                  tabindex="-1"
                  aria-hidden="true"
                  [disabled]="carrinho.ocupado()"
                  (click)="diminuirOuRemover(item)"
                >
                  −
                </button>
                <input
                  #quantidade
                  [id]="'quantidade-' + item.linha.id"
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  [value]="item.linha.quantidade"
                  [disabled]="carrinho.ocupado()"
                  (change)="alterarQuantidade(item, quantidade)"
                />
                <button
                  class="btn-passo"
                  type="button"
                  tabindex="-1"
                  aria-hidden="true"
                  [disabled]="carrinho.ocupado() || item.linha.quantidade >= 99"
                  (click)="carrinho.alterarQuantidade(item.linha.id, item.linha.quantidade + 1)"
                >
                  +
                </button>
              </div>
              <div class="t-links">
                <button
                  class="link"
                  type="button"
                  (click)="editarComposicao(item, $event.currentTarget)"
                  [disabled]="carrinho.ocupado() || !carrinho.online() || consultandoCatalogo()"
                >
                  Editar<span class="sr-only"> composição do item {{ indice + 1 }}</span>
                </button>
                <button
                  class="link"
                  type="button"
                  (click)="carrinho.remover(item.linha.id)"
                  [disabled]="carrinho.ocupado()"
                >
                  Remover<span class="sr-only"> item {{ indice + 1 }}</span>
                </button>
              </div>
            </div>
          </article>
        } @empty {
          <p class="vazio">Seu carrinho está vazio.</p>
        }
      </div>

      @if (carrinho.itens().length) {
        <div class="t-sum">
          <div class="muted">
            <span>Itens</span>
            <span>{{ totalEstimado() }}</span>
          </div>
          @if (carrinho.contexto()?.canal === 'DELIVERY') {
            <div class="muted">
              <span>Entrega</span>
              <span>calculada pelo seu endereço</span>
            </div>
          }
          <div class="total">
            <span>Total parcial</span>
            <span>{{ totalEstimado() }}</span>
          </div>
        </div>
        @if (carrinho.confirmado()) {
          <p class="fresh">Valores conferidos pelo restaurante.</p>
        } @else {
          <p class="fresh">Valores estimados até a revisão do pedido.</p>
        }
        <div class="acoes acoes-revisar">
          <button
            hlmBtn
            class="cta btn-revisar-pedido"
            type="button"
            aria-label="Revisar meu pedido"
            (click)="abrirRevisao($event.currentTarget)"
            [disabled]="carrinho.ocupado() || !carrinho.online()"
          >
            <span>Revisar meu pedido</span>
            <span class="amount" aria-hidden="true">{{ totalEstimado() }}</span>
          </button>
        </div>
      }

      <dialog
        #modalRevisao
        class="cfg-dlg revisao-dlg"
        aria-labelledby="revisao-modal-titulo"
        (cancel)="fecharRevisao()"
        (click)="$event.target === modalRevisao && fecharRevisao()"
      >
        <section class="revisao-modal-card">
          <header class="revisao-modal-topo">
            <div>
              <p class="kicker">Conferência &amp; Finalização</p>
              <h2 id="revisao-modal-titulo">Revisar e enviar pedido</h2>
            </div>
            <button type="button" class="revisao-modal-fechar" (click)="fecharRevisao()" aria-label="Fechar revisão do pedido">
              ✕
            </button>
          </header>

          <div class="revisao-modal-corpo">
            @if (modalRevisaoAberto() && !carrinho.online()) {
              <p role="status" class="aviso-comanda">
                Reconecte para conferir preços e disponibilidade.
              </p>
            }
            @if (carrinho.erro()) {
              <p role="alert" class="erro">{{ carrinho.erro() }}</p>
            }
            @if (carrinho.aviso() && avisoImportante()) {
              <p role="status" class="aviso-comanda">{{ carrinho.aviso() }}</p>
            }
            @if (carrinho.resumo(); as resumo) {
              <section class="resumo-comanda" aria-labelledby="resumo-titulo">
                <h3 id="resumo-titulo">Resumo dos itens</h3>
                @for (linha of resumo.linhas; track linha.id; let indice = $index) {
                  <article class="item item-resumo">
                    <div class="item-resumo-cabecalho">
                      @if (midiaDaLinhaResumo(linha.id, linha.produtoId); as midia) {
                        <div class="item-thumb item-thumb--resumo">
                          <img
                            class="item-thumb-img"
                            [src]="'/api/v1/midias/' + midia"
                            [alt]="linha.nome"
                            width="48"
                            height="48"
                            loading="lazy"
                            decoding="async"
                            (error)="registrarErroMidia(midia)"
                          />
                        </div>
                      } @else {
                        <div
                          class="item-thumb item-thumb--mono item-thumb--resumo"
                          aria-hidden="true"
                        >
                          {{ inicialProduto(linha.nome) }}
                        </div>
                      }
                      <div class="item-resumo-titulo">
                        <h4>{{ indice + 1 }}. {{ linha.quantidade }} × {{ linha.nome }}</h4>
                        <p>
                          Preço base: {{ moeda(linha.precoBase) }} · Valor de cada configuração:
                          {{ moeda(linha.precoUnitario) }}
                        </p>
                      </div>
                    </div>
                    @if (linha.adicionais.length) {
                      <ul>
                        @for (adicional of linha.adicionais; track adicional.adicionalId) {
                          <li>
                            {{ adicional.quantidade }} × {{ adicional.nome }}:
                            {{ moeda(adicional.total) }}
                          </li>
                        }
                      </ul>
                    }
                    @for (escolha of linha.escolhas; track $index) {
                      <p>
                        {{ escolha.grupo }}: {{ escolha.quantidade }} × {{ escolha.nome }} · Acréscimo por
                        escolha: {{ moeda(escolha.acrescimo) }} · Total da escolha:
                        {{ moeda(escolha.total) }}
                      </p>
                      @if (escolha.adicionais.length) {
                        <ul>
                          @for (adicional of escolha.adicionais; track adicional.adicionalId) {
                            <li>
                              {{ adicional.quantidade }} × {{ adicional.nome }} por escolha ·
                              {{ moeda(adicional.precoUnitario) }} cada
                            </li>
                          }
                        </ul>
                      }
                    }
                    <p class="subtotal-linha">
                      <strong>Subtotal do item: {{ moeda(linha.subtotal) }}</strong>
                    </p>
                  </article>
                }
                <div class="total-comanda">
                  <p class="total-valor">
                    <strong>Total dos itens: {{ moeda(resumo.total) }}</strong>
                  </p>
                  <p class="nota-moeda">
                    Valores em BRL. Este resumo inclui somente os itens; não inclui frete, gorjeta ou taxa
                    de serviço.
                  </p>
                </div>
                @if (!carrinho.confirmado()) {
                  <button
                    hlmBtn
                    class="cta btn-confirmar-resumo"
                    type="button"
                    (click)="confirmarResumo()"
                    [disabled]="carrinho.ocupado() || !carrinho.online()"
                  >
                    Confirmar composição e valores
                  </button>
                }
              </section>
            } @else if (carrinho.ocupado()) {
              <p role="status" class="aviso-comanda">Conferindo preços e disponibilidade atuais…</p>
            } @else if (modalRevisaoAberto() && carrinho.online() && carrinho.itens().length) {
              <button hlmBtn type="button" (click)="carrinho.calcular()">Revisar meu pedido</button>
            }

          </div>
        </section>
      </dialog>

      <div #finalizacao [class.confirmacao-oculta]="!exibirConfirmacao() || modalRevisaoAberto()">
        @if (carrinho.confirmado()) {
          <p role="status" class="resumo-confirmado">
            Resumo confirmado. O envio do pedido exige confirmação separada.
          </p>
        }
        <app-confirmar-pedido [apresentacaoCliente]="apresentacaoCliente()" />
      </div>
    </section>
  `,
  styleUrls: ['../catalogo/catalogo.css', './carrinho.css'],
})
export class CarrinhoComponent {
  readonly apresentacaoCliente = input(false);
  readonly consultandoCatalogo = input(false);
  private readonly catalogoConhecido = new Map<string, ProdutoPublico>();

  @Input() set produtos(lista: ProdutoPublico[]) {
    for (const item of lista ?? []) {
      this.catalogoConhecido.set(item.id, item);
    }
  }

  @Input() exibirImagens = true;

  @Output() editar = new EventEmitter<{ item: ItemCarrinho; acionador: HTMLButtonElement }>();
  private readonly injector = inject(Injector);
  @ViewChild('finalizacao') private finalizacao?: ElementRef<HTMLElement>;
  @ViewChild('modalRevisao') private modalRevisao?: ElementRef<HTMLDialogElement>;
  @ViewChild(ConfirmarPedidoComponent) private confirmarComp?: ConfirmarPedidoComponent;
  private readonly catalogoMidia = inject(CatalogoMidiaService, { optional: true });
  private retornoFocoRevisao: HTMLElement | null = null;
  readonly modalRevisaoAberto = signal(false);
  readonly midiasComErro = signal<Record<string, boolean>>({});
  readonly carrinho = inject(CarrinhoService);
  readonly moeda = moeda;

  constructor() {
    effect(() => {
      const contexto = this.carrinho.contexto();
      const itens = this.carrinho.itens();
      if (!contexto || !itens.length) return;
      const ids = itens.map((item) => item.linha.produtoId);
      untracked(() => void this.catalogoMidia?.garantir?.(contexto.unidadeId, contexto.canal, ids));
    });
  }

  midiaDoItem(item: ItemCarrinho): string | null {
    const conhecido = this.catalogoConhecido.get(item.linha.produtoId);
    let bruto: string | null = null;
    if (conhecido) {
      bruto = conhecido.midiaId;
    } else if (item.midiaId !== undefined) {
      bruto = item.midiaId;
    } else {
      bruto = this.catalogoMidia?.midiaDoProduto?.(item.linha.produtoId) ?? null;
    }
    return bruto && !this.midiasComErro()[bruto] ? bruto : null;
  }

  midiaDaLinhaResumo(linhaId: string, produtoId?: string | null): string | null {
    const item = this.extrasDaLinha(linhaId);
    if (item) return this.midiaDoItem(item);
    if (!produtoId) return null;
    const conhecido = this.catalogoConhecido.get(produtoId);
    const bruto = conhecido
      ? conhecido.midiaId
      : (this.catalogoMidia?.midiaDoProduto?.(produtoId) ?? null);
    return bruto && !this.midiasComErro()[bruto] ? bruto : null;
  }

  registrarErroMidia(midiaId: string): void {
    if (!this.midiasComErro()[midiaId]) {
      this.midiasComErro.update((atual) => ({ ...atual, [midiaId]: true }));
    }
  }

  inicialProduto(nome: string): string {
    return (nome || '').trim().slice(0, 1).toUpperCase();
  }

  exibirConfirmacao(): boolean {
    if (this.carrinho.resumo()) return true;
    if (!this.carrinho.online() && this.carrinho.itens().length) return true;
    if (!this.confirmarComp) return false;
    return Boolean(
      this.confirmarComp.confirmado() ||
      this.confirmarComp.erro() ||
      this.confirmarComp.envio.pendente(this.confirmarComp.tipoMesa()),
    );
  }

  extrasDaLinha(id: string): ItemCarrinho | undefined {
    return this.carrinho.itens().find((i) => i.linha.id === id);
  }

  async abrirRevisao(acionador?: EventTarget | null): Promise<void> {
    this.retornoFocoRevisao = acionador instanceof HTMLElement ? acionador : null;
    this.modalRevisaoAberto.set(true);
    setTimeout(() => {
      const dlg = this.modalRevisao?.nativeElement;
      if (dlg && !dlg.open) dlg.showModal();
    }, 0);
    await this.carrinho.calcular();
  }

  async confirmarResumo(): Promise<void> {
    await this.carrinho.calcular(true);
    if (!this.carrinho.confirmado()) return;
    this.fecharRevisao();
    afterNextRender(
      () => {
        const titulo =
          this.finalizacao?.nativeElement.querySelector<HTMLElement>('#enviar-pedido-titulo');
        if (!titulo) return;
        titulo.tabIndex = -1;
        titulo.focus({ preventScroll: true });
        titulo.scrollIntoView({ block: 'nearest' });
      },
      { injector: this.injector },
    );
  }

  fecharRevisao(): void {
    const dlg = this.modalRevisao?.nativeElement;
    if (dlg?.open) dlg.close();
    this.modalRevisaoAberto.set(false);
    this.retornoFocoRevisao?.focus();
  }

  nomeCanal(canal: string): string {
    return CANAIS.find((item) => item.valor === canal)?.nome ?? canal;
  }

  nomeCurtoUnidade(nome: string): string {
    return nome.replace(/^Unidade\s+/i, '');
  }

  quantidadeTotal(): number {
    return this.carrinho.itens().reduce((soma, item) => soma + item.linha.quantidade, 0);
  }

  avisoImportante(): boolean {
    const msg = this.carrinho.aviso();
    return (
      msg.includes('catálogo mudou') ||
      msg.includes('preservados') ||
      msg.includes('expir') ||
      msg.includes('Sem conexão') ||
      msg.includes('restabelecida')
    );
  }

  diminuirOuRemover(item: ItemCarrinho): void {
    if (item.linha.quantidade > 1) {
      this.carrinho.alterarQuantidade(item.linha.id, item.linha.quantidade - 1);
    } else {
      this.carrinho.remover(item.linha.id);
    }
  }

  subtotalItem(item: ItemCarrinho): string | null {
    const calculada = this.carrinho.resumo()?.linhas.find((linha) => linha.id === item.linha.id);
    if (calculada) return calculada.subtotal;

    const prod = this.catalogoConhecido.get(item.linha.produtoId);
    if (!prod) return null;

    let unitario = Number(prod.preco) || 0;
    for (const sel of item.linha.adicionais) {
      const add = prod.adicionais.find((a) => a.id === sel.adicionalId);
      if (add) unitario += (Number(add.preco) || 0) * sel.quantidade;
    }
    for (const esc of item.linha.escolhas) {
      const grp = prod.grupos.find((g) => g.id === esc.grupoId);
      const opc = grp?.opcoes.find((o) => o.id === esc.opcaoId);
      if (opc) {
        unitario += (Number(opc.acrescimo) || 0) * esc.quantidade;
        for (const extra of esc.adicionais) {
          const add = opc.adicionais.find((a) => a.id === extra.adicionalId);
          if (add) unitario += (Number(add.preco) || 0) * extra.quantidade;
        }
      }
    }
    return (unitario * item.linha.quantidade).toFixed(2);
  }

  detalhesItem(item: ItemCarrinho): string[] {
    const calculada = this.carrinho.resumo()?.linhas.find((linha) => linha.id === item.linha.id);
    if (calculada) {
      const linhas: string[] = [];
      if (calculada.escolhas.length) {
        linhas.push(calculada.escolhas.map((e) => e.nome).join(' · '));
        for (const esc of calculada.escolhas) {
          for (const add of esc.adicionais) {
            linhas.push(`+ ${add.nome} (${moeda(add.total)})`);
          }
        }
      }
      for (const add of calculada.adicionais) {
        linhas.push(`+ ${add.nome} (${moeda(add.total)})`);
      }
      return linhas.length ? linhas : ['Sem adicionais extras'];
    }

    const prod = this.catalogoConhecido.get(item.linha.produtoId);
    if (!prod) return [];

    const linhas: string[] = [];
    if (item.linha.escolhas.length) {
      const nomesOpcoes: string[] = [];
      for (const esc of item.linha.escolhas) {
        const grp = prod.grupos.find((g) => g.id === esc.grupoId);
        const opc = grp?.opcoes.find((o) => o.id === esc.opcaoId);
        if (opc) {
          nomesOpcoes.push(opc.nome);
          for (const extra of esc.adicionais) {
            const add = opc.adicionais.find((a) => a.id === extra.adicionalId);
            if (add) {
              const total = ((Number(add.preco) || 0) * extra.quantidade).toFixed(2);
              linhas.push(`+ ${add.nome} (${moeda(total)})`);
            }
          }
        }
      }
      if (nomesOpcoes.length) linhas.unshift(nomesOpcoes.join(' · '));
    }
    for (const sel of item.linha.adicionais) {
      const add = prod.adicionais.find((a) => a.id === sel.adicionalId);
      if (add) {
        const total = ((Number(add.preco) || 0) * sel.quantidade).toFixed(2);
        linhas.push(`+ ${add.nome} (${moeda(total)})`);
      }
    }
    return linhas.length ? linhas : ['Sem adicionais extras'];
  }

  totalEstimado(): string {
    const resumo = this.carrinho.resumo();
    if (resumo) return moeda(resumo.total);
    let centavos = 0;
    for (const item of this.carrinho.itens()) {
      const subtotal = this.subtotalItem(item);
      if (subtotal === null) return 'A consultar';
      centavos += Math.round(Number(subtotal) * 100);
    }
    return moeda((centavos / 100).toFixed(2));
  }

  editarComposicao(item: ItemCarrinho, acionador: EventTarget | null): void {
    // Safari pode não focar botões acionados pelo ponteiro; preserve o retorno do diálogo.
    if (acionador instanceof HTMLButtonElement) this.editar.emit({ item, acionador });
  }

  alterarQuantidade(item: ItemCarrinho, input: HTMLInputElement): void {
    this.carrinho.alterarQuantidade(item.linha.id, Number(input.value));
    input.value = String(
      this.carrinho.itens().find((atual) => atual.linha.id === item.linha.id)?.linha.quantidade ??
        item.linha.quantidade,
    );
  }
}
