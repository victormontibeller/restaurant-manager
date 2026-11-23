import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  viewChild,
} from '@angular/core';
import { Data, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CarrinhoService } from '../carrinho/carrinho.service';
import { SessaoService } from '../identidade/sessao.service';
import { SessaoMesaService } from '../mesas/sessao-mesa.service';
import { AlternarTemaComponent } from '../ui/alternar-tema.component';
import { HlmButton } from '../ui/button';
import { IconeComponent } from './icone.component';
import { MarcaService } from './marca.service';

@Component({
  selector: 'app-cliente-layout',
  imports: [
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    HlmButton,
    IconeComponent,
    AlternarTemaComponent,
  ],
  template: `
    <header class="client-header" [class.vitrine-cliente]="visualCliente(pagina.activatedRouteData)" [class.cabecalho-convite]="pagina.activatedRouteData['formulario'] === 'convite'">
      <a routerLink="/cardapio" class="restaurant-brand" aria-label="Ir ao cardápio"><span class="brand-mark" aria-hidden="true"><app-icone nome="marca"/></span><span>{{ marca.nome() }}</span></a>
      <nav class="desktop-nav" aria-label="Navegação do cliente">
        <a routerLink="/cardapio" routerLinkActive="active" ariaCurrentWhenActive="page">Cardápio</a>
        <a [routerLink]="mesa.participante() ? ['/mesa'] : ['/pedidos']" routerLinkActive="active" ariaCurrentWhenActive="page">{{ mesa.participante() ? 'Minha mesa' : 'Meus pedidos' }}</a>
      </nav>
      <div class="header-actions"><app-alternar-tema/><a class="account-link" [routerLink]="sessao.identidade() ? '/conta' : '/entrar'"><app-icone nome="conta"/><span>{{ sessao.identidade() ? 'Minha conta' : 'Entrar' }}</span></a><a hlmBtn routerLink="/carrinho" class="cart-link" aria-label="Abrir carrinho"><app-icone nome="sacola"/><span>Carrinho</span><b>{{ quantidade() }}</b></a></div>
    </header>
    <main id="conteudo" class="client-main" [class.vitrine-cliente]="visualCliente(pagina.activatedRouteData)" tabindex="-1"><router-outlet #pagina="outlet"/></main>
    <footer class="client-footer"><span><strong>{{ marca.nome() }}</strong><br>Feito para bons momentos à mesa.</span><a routerLink="/gestao/entrar">Área da equipe <app-icone nome="seta"/></a></footer>
    <nav #navMovel class="mobile-nav" aria-label="Navegação do cliente no celular">
      <a routerLink="/cardapio" routerLinkActive="active" ariaCurrentWhenActive="page"><app-icone nome="cardapio"/><span>Cardápio</span></a>
      <a routerLink="/carrinho" routerLinkActive="active" ariaCurrentWhenActive="page"><app-icone nome="sacola"/><span>Carrinho ({{ quantidade() }})</span></a>
      <a [routerLink]="mesa.participante() ? ['/mesa'] : ['/pedidos']" routerLinkActive="active" ariaCurrentWhenActive="page"><app-icone nome="pedidos"/><span>{{ mesa.participante() ? 'Minha mesa' : 'Pedidos' }}</span></a>
      <a [routerLink]="sessao.identidade() ? '/conta' : '/entrar'" routerLinkActive="active" ariaCurrentWhenActive="page"><app-icone nome="conta"/><span>Conta</span></a>
    </nav>
  `,
  styleUrl: './cliente-layout.css',
})
export class ClienteLayoutComponent {
  readonly marca = inject(MarcaService);
  readonly sessao = inject(SessaoService);
  readonly mesa = inject(SessaoMesaService);
  private readonly navMovel = viewChild.required<ElementRef<HTMLElement>>('navMovel');
  private readonly carrinho = inject(CarrinhoService);
  readonly quantidade = this.carrinho.quantidadeItens;

  protected visualCliente(dados: Data): boolean {
    return (
      dados['visualCliente'] === true &&
      (dados['formulario'] !== 'conta' || this.sessao.identidade()?.perfil === 'CLIENTE')
    );
  }

  constructor() {
    const layout = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const raiz = layout.parentElement ?? layout;
    const destroy = inject(DestroyRef);
    afterNextRender(() => {
      const nav = this.navMovel().nativeElement;
      const observador = new ResizeObserver(() => {
        raiz.style.setProperty('--cliente-nav-altura', `${nav.offsetHeight}px`);
      });
      observador.observe(nav, { box: 'border-box' });
      destroy.onDestroy(() => {
        observador.disconnect();
        raiz.style.removeProperty('--cliente-nav-altura');
      });
    });
  }
}
