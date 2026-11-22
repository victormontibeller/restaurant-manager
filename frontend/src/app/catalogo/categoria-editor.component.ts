import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { HlmButton } from '../ui/button';
import { Categoria } from './modelos';

@Component({
  selector: 'app-categoria-editor',
  imports: [HlmButton],
  template: `
    <div class="gc-editor-panel">
      <div class="gc-sec-head">
        <span class="gc-sec-num">CATEGORIA</span>
        <span class="gc-sec-dotted"></span>
        <span class="gc-sec-sub">Compartilhada entre unidades</span>
      </div>
      <form class="gc-form" (submit)="salvar($event)" aria-label="Editor de categoria">
        <fieldset [disabled]="bloqueado" class="gc-fieldset-flat">
          <legend>{{ nova ? 'Nova categoria' : 'Editar categoria' }}</legend>
          <div class="gc-grid-2" style="align-items: end">
            <div class="gc-field">
              <label for="categoria-nome">Nome da categoria</label>
              <input
                #nome
                id="categoria-nome"
                required
                maxlength="120"
                [value]="rascunho.nome"
                (input)="rascunho.nome = nome.value"
              />
            </div>
            <label class="gc-tactile-switch" [class.checked]="rascunho.ativa">
              <input
                #ativa
                type="checkbox"
                [checked]="rascunho.ativa"
                (change)="rascunho.ativa = ativa.checked"
              />
              <span>Categoria ativa</span>
            </label>
          </div>
          <p class="gc-nota">
            O nome e a ativação desta categoria são compartilhados por todas as unidades.
            Desativá-la retira seus produtos da vitrine.
          </p>
          <div class="gc-acoes-rodape">
            <button hlmBtn type="submit">
              {{ nova ? 'Criar categoria' : 'Salvar categoria' }}
            </button>
            <button hlmBtn variant="outline" type="button" (click)="cancelar.emit()">
              Cancelar <span class="sr-only">edição de categoria</span>
            </button>
          </div>
        </fieldset>
      </form>
    </div>
  `,
  styleUrls: ['./catalogo.css', './gestao-catalogo.css'],
})
export class CategoriaEditorComponent implements OnChanges {
  @Input({ required: true }) categoria!: Categoria;
  @Input() nova = false;
  @Input() bloqueado = false;
  @Output() salvarCategoria = new EventEmitter<Categoria>();
  @Output() cancelar = new EventEmitter<void>();
  rascunho: Categoria = { id: '', nome: '', ativa: true, versao: 0 };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['categoria']) {
      this.rascunho = structuredClone(this.categoria);
    }
  }

  salvar(event: Event): void {
    event.preventDefault();
    if (!this.bloqueado) this.salvarCategoria.emit(structuredClone(this.rascunho));
  }
}
