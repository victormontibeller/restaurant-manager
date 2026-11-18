import { Component, inject } from '@angular/core';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from './button';
import { TemaService } from './tema.service';

@Component({
  selector: 'app-alternar-tema',
  imports: [HlmButton, IconeComponent],
  template: `
    <button hlmBtn variant="ghost" size="icon" type="button" class="alternar-tema"
      [attr.aria-label]="tema.atual() === 'escuro' ? 'Ativar tema claro' : 'Ativar tema escuro'"
      [attr.title]="tema.atual() === 'escuro' ? 'Ativar tema claro' : 'Ativar tema escuro'"
      (click)="tema.alternar()">
      <app-icone [nome]="tema.atual() === 'escuro' ? 'sol' : 'lua'" />
    </button>`,
  styles: ':host {display:inline-flex;flex:none} button {color:inherit}',
})
export class AlternarTemaComponent {
  readonly tema = inject(TemaService);
}
