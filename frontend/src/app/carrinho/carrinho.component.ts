import {
  Component,
  ElementRef,
  EventEmitter,
  Injector,
  Output,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from '../ui/button';
import { CANAIS, moeda } from '../catalogo/modelos';
import { CarrinhoService } from './carrinho.service';
import { ConfirmarPedidoComponent } from '../pedidos/confirmar-pedido.component';
import { ItemCarrinho } from './modelos';

@Component({
  selector: 'app-carrinho',
  imports: [ConfirmarPedidoComponent, HlmButton, IconeComponent, NgTemplateOutlet, RouterLink],
  templateUrl: './carrinho.component.html',
  host: { '[class.carrinho-cliente]': 'apresentacaoCliente()' },
  styleUrls: ['../catalogo/catalogo.css', './carrinho.css', './carrinho-cliente.css'],
})
export class CarrinhoComponent {
  @Output() editar = new EventEmitter<ItemCarrinho>();
  readonly apresentacaoCliente = input(false);
  readonly consultandoCatalogo = input(false);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  readonly carrinho = inject(CarrinhoService);
  readonly moeda = moeda;
  readonly midiasIndisponiveis = signal<ReadonlySet<string>>(new Set());
  readonly quantidade = computed(() =>
    this.carrinho.itens().reduce((total, item) => total + item.linha.quantidade, 0),
  );

  async calcular(confirmar: boolean, origem: HTMLButtonElement): Promise<void> {
    await this.carrinho.calcular(confirmar);
    if (!this.apresentacaoCliente() || !this.elemento.nativeElement.isConnected) return;
    afterNextRender(
      () => {
        const documento = origem.ownerDocument;
        if (documento.activeElement !== origem && documento.activeElement !== documento.body)
          return;
        const destino = this.carrinho.confirmado()
          ? '#enviar-pedido-titulo'
          : this.carrinho.resumo()
            ? '#resumo-titulo'
            : '.retorno-carrinho [role="alert"]';
        const alvo = this.elemento.nativeElement.querySelector<HTMLElement>(destino);
        alvo?.focus({ preventScroll: true });
        alvo?.scrollIntoView({ block: 'start' });
      },
      { injector: this.injector },
    );
  }

  nomeCanal(canal: string): string {
    return CANAIS.find((item) => item.valor === canal)?.nome ?? canal;
  }

  ocultarMidia(id: string): void {
    this.midiasIndisponiveis.update((indisponiveis) => new Set([...indisponiveis, id]));
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
