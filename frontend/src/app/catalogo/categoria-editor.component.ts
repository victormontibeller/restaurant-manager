import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Categoria } from './modelos';

@Component({
  selector: 'app-categoria-editor',
  templateUrl: './categoria-editor.component.html',
  styleUrls: ['./catalogo.css', './catalogo-editor.css'],
})
export class CategoriaEditorComponent implements OnChanges {
  @Input({ required: true }) categoria!: Categoria;
  @Input() nova = false;
  @Input() bloqueado = false;
  @Input() erroNome = false;
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
