import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HlmButton } from '../ui/button';
import { IconeComponent } from './icone.component';

@Component({
  selector: 'app-pagina-informativa',
  imports: [RouterLink, HlmButton, IconeComponent],
  template: `<section><span class="illustration"><app-icone [nome]="acesso?'conta':'cardapio'"/></span><p>{{acesso?'ÁREA DA EQUIPE':'VAMOS VOLTAR AO CARDÁPIO?'}}</p><h1>{{acesso?'Esta área não está no seu acesso.':'Essa página saiu do cardápio.'}}</h1><p>{{acesso?'Seu perfil e suas unidades determinam as áreas disponíveis. Fale com a administração se precisar de outro acesso.':'O endereço pode ter mudado. Você pode continuar escolhendo seu próximo pedido.'}}</p><div><a hlmBtn routerLink="/cardapio">Ver cardápio</a><a hlmBtn variant="outline" routerLink="/conta">Minha conta</a></div></section>`,
  styles: `section{max-width:600px;margin:3rem auto;text-align:center;padding:2rem}h1{font-size:2.4rem;line-height:1.15;letter-spacing:-.04em}p{color:var(--rm-muted,#6b746c);line-height:1.7}div{display:flex;justify-content:center;gap:.8rem;flex-wrap:wrap;margin-top:2rem}.illustration{display:inline-grid;place-items:center;width:80px;height:80px;background:#eaf0e5;color:#254d36;border-radius:24px}.illustration app-icone{width:36px;height:36px}`,
})
export class PaginaInformativaComponent {
  readonly acesso = inject(ActivatedRoute).snapshot.data['semAcesso'] === true;
}
