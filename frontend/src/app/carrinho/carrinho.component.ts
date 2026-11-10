import { Component, EventEmitter, Output, inject } from '@angular/core';
import { HlmButton } from '../ui/button';
import { CANAIS, moeda } from '../catalogo/modelos';
import { CarrinhoService } from './carrinho.service';
import { ConfirmarPedidoComponent } from '../pedidos/confirmar-pedido.component';
import { ItemCarrinho } from './modelos';

@Component({
  selector: 'app-carrinho',
  imports: [ConfirmarPedidoComponent, HlmButton],
  template: `
    <section aria-labelledby="carrinho-titulo" [attr.aria-busy]="carrinho.ocupado()">
      <h2 id="carrinho-titulo">Meu carrinho</h2>
      @if (carrinho.contexto(); as contexto) {
        <p>{{ contexto.unidadeNome }} · {{ nomeCanal(contexto.canal) }}</p>
      }
      <p class="carrinho-instrucao">Confira seus itens e confirme o envio ao finalizar.</p>
      <details class="carrinho-ajuda"><summary>Sobre o carrinho e os valores</summary><p>Os itens ficam nesta aba durante a navegação. Atualizar ou fechar a página descarta o rascunho. O resumo é validado pelo restaurante antes do envio.</p></details>
      @if (carrinho.erro()) {
        <p role="alert" class="erro">{{ carrinho.erro() }}</p>
      }
      @if (carrinho.aviso()) {
        <p role="status">{{ carrinho.aviso() }}</p>
      }
      @for (item of carrinho.itens(); track item.linha.id; let indice = $index) {
        <article class="item" [attr.aria-label]="'Item ' + (indice + 1) + ': ' + item.nome">
          <h3>{{ item.nome }}</h3>
          <label [for]="'quantidade-' + item.linha.id"
            >Quantidade de {{ item.nome }} (item {{ indice + 1 }})</label
          >
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
          <p>
            Composição: {{ item.linha.escolhas.length }}
            {{ item.linha.escolhas.length === 1 ? 'escolha' : 'escolhas' }} e
            {{ item.linha.adicionais.length }}
            {{ item.linha.adicionais.length === 1 ? 'adicional' : 'adicionais' }}.
          </p>
          <div class="acoes">
            <button hlmBtn
              class="secundario"
              type="button"
              (click)="editarComposicao(item, $event.currentTarget)"
              [disabled]="carrinho.ocupado() || !carrinho.online()"
            >
              Editar composição do item {{ indice + 1 }}
            </button>
            <button hlmBtn
              class="secundario"
              type="button"
              (click)="carrinho.remover(item.linha.id)"
              [disabled]="carrinho.ocupado()"
            >
              Remover item {{ indice + 1 }}
            </button>
          </div>
        </article>
      } @empty {
        <p class="vazio">Seu carrinho está vazio.</p>
      }
      @if (carrinho.itens().length) {
        <div class="acoes">
          <button hlmBtn
            type="button"
            (click)="carrinho.calcular()"
            [disabled]="carrinho.ocupado() || !carrinho.online()"
          >
            Revisar meu pedido
          </button>
        </div>
      }
      @if (carrinho.resumo(); as resumo) {
        <section aria-labelledby="resumo-titulo">
          <h3 id="resumo-titulo">Resumo dos itens</h3>
          @for (linha of resumo.linhas; track linha.id; let indice = $index) {
            <article class="item">
              <h4>{{ indice + 1 }}. {{ linha.quantidade }} × {{ linha.nome }}</h4>
              <p>
                Preço base: {{ moeda(linha.precoBase) }} · Valor de cada configuração:
                {{ moeda(linha.precoUnitario) }}
              </p>
              @if (linha.adicionais.length) {
                <ul>
                  @for (adicional of linha.adicionais; track adicional.adicionalId) {
                    <li>
                      {{ adicional.quantidade }} × {{ adicional.nome }}: {{ moeda(adicional.total) }}
                    </li>
                  }
                </ul>
              }
              @for (escolha of linha.escolhas; track $index) {
                <p>
                  {{ escolha.grupo }}: {{ escolha.quantidade }} × {{ escolha.nome }} · Acréscimo por
                  escolha: {{ moeda(escolha.acrescimo) }} · Total da escolha: {{ moeda(escolha.total) }}
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
              <p>
                <strong>Subtotal do item: {{ moeda(linha.subtotal) }}</strong>
              </p>
            </article>
          }
          <p>
            <strong>Total dos itens: {{ moeda(resumo.total) }}</strong>
          </p>
          <p>
            Valores em BRL. Este resumo inclui somente os itens; não inclui frete, gorjeta ou taxa de
            serviço.
          </p>
          @if (!carrinho.confirmado()) {
            <button hlmBtn
              type="button"
              (click)="carrinho.calcular(true)"
              [disabled]="carrinho.ocupado() || !carrinho.online()"
            >
              Confirmar composição e valores
            </button>
          } @else {
            <p role="status">Resumo confirmado. O envio do pedido exige confirmação separada.</p>
          }
        </section>
      }
      <app-confirmar-pedido/>
    </section>
  `,
  styleUrls: ['../catalogo/catalogo.css', './carrinho.css'],
})
export class CarrinhoComponent {
  @Output() editar = new EventEmitter<ItemCarrinho>();
  readonly carrinho = inject(CarrinhoService);
  readonly moeda = moeda;

  nomeCanal(canal: string): string {
    return CANAIS.find((item) => item.valor === canal)?.nome ?? canal;
  }

  editarComposicao(item: ItemCarrinho, acionador: EventTarget | null): void {
    // Safari pode não focar botões acionados pelo ponteiro; preserve o retorno do diálogo.
    if (acionador instanceof HTMLElement) acionador.focus({ preventScroll: true });
    this.editar.emit(item);
  }

  alterarQuantidade(item: ItemCarrinho, input: HTMLInputElement): void {
    this.carrinho.alterarQuantidade(item.linha.id, Number(input.value));
    input.value = String(
      this.carrinho.itens().find((atual) => atual.linha.id === item.linha.id)?.linha.quantidade ??
        item.linha.quantidade,
    );
  }
}
