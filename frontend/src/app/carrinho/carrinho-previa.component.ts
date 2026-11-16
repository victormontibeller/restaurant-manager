import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CANAIS } from '../catalogo/modelos';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from '../ui/button';
import { CarrinhoService } from './carrinho.service';

@Component({
  selector: 'app-carrinho-previa',
  imports: [RouterLink, HlmButton, IconeComponent],
  templateUrl: './carrinho-previa.component.html',
  styleUrl: './carrinho-previa.css',
})
export class CarrinhoPreviaComponent {
  private readonly carrinho = inject(CarrinhoService);
  protected readonly contexto = this.carrinho.contexto;
  protected readonly canal = computed(
    () => CANAIS.find(({ valor }) => valor === this.contexto()?.canal)?.nome,
  );
  protected readonly quantidade = computed(() =>
    this.carrinho.itens().reduce((total, { linha }) => total + linha.quantidade, 0),
  );
  protected readonly itensVisiveis = computed(() => this.carrinho.itens().slice(0, 3));
  protected readonly restantes = computed(
    () => this.carrinho.itens().length - this.itensVisiveis().length,
  );
}
