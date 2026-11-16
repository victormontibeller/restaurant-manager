import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HlmButton } from '../ui/button';
import { IconeComponent } from './icone.component';

@Component({
  selector: 'app-pagina-informativa',
  imports: [RouterLink, HlmButton, IconeComponent],
  host: { '[class.informativa-cliente]': 'visualCliente' },
  template: `
    <section>
      <span class="illustration"><app-icone [nome]="acesso ? 'conta' : 'cardapio'" /></span>
      @if (!visualCliente) {
        <p>{{ acesso ? 'ÁREA DA EQUIPE' : 'VAMOS VOLTAR AO CARDÁPIO?' }}</p>
      }
      <h1>{{ acesso ? 'Esta área não está no seu acesso.' : 'Essa página saiu do cardápio.' }}</h1>
      <p>
        {{
          acesso
            ? 'Seu perfil e suas unidades determinam as áreas disponíveis. Fale com a administração se precisar de outro acesso.'
            : 'O endereço pode ter mudado. Você pode voltar ao cardápio ou informar sua mesa.'
        }}
      </p>
      <div>
        <a hlmBtn routerLink="/cardapio">Ver cardápio</a>
        @if (acesso) {
          <a hlmBtn variant="outline" routerLink="/conta">Minha conta</a>
        } @else {
          <a hlmBtn variant="outline" routerLink="/mesa">Minha mesa</a>
        }
      </div>
    </section>
  `,
  styleUrl: './pagina-informativa.component.css',
})
export class PaginaInformativaComponent {
  private readonly dados = inject(ActivatedRoute).snapshot.data;
  readonly acesso = this.dados['semAcesso'] === true;
  readonly visualCliente = this.dados['visualCliente'] === true;
}
