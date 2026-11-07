import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Categoria } from './modelos';

@Component({
  selector: 'app-categoria-editor',
  template: `
    <form (submit)="salvar($event)" aria-label="Editor de categoria">
      <fieldset [disabled]="bloqueado" class="campos">
        <legend>{{ nova ? 'Nova categoria' : 'Editar categoria' }}</legend>
        <label for="categoria-nome">Nome da categoria</label>
        <input
          #nome
          id="categoria-nome"
          required
          maxlength="120"
          [value]="rascunho.nome"
          (input)="rascunho.nome = nome.value"
        />
        <label class="check"
          ><input
            #ativa
            type="checkbox"
            [checked]="rascunho.ativa"
            (change)="rascunho.ativa = ativa.checked"
          />Categoria ativa</label
        >
        <p>
          O nome e a ativação desta categoria são compartilhados por todas as unidades. Desativá-la
          retira seus produtos da vitrine.
        </p>
        <div class="acoes">
          <button>{{ nova ? 'Criar categoria' : 'Salvar categoria' }}</button>
          <button class="secundario" type="button" (click)="cancelar.emit()">
            Cancelar edição de categoria
          </button>
        </div>
      </fieldset>
    </form>
  `,
  styleUrl: './catalogo.css',
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
