import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Adicional } from './modelos';

@Component({
  selector: 'app-adicionais-editor',
  templateUrl: './adicionais-editor.component.html',
  styleUrls: ['./catalogo.css', './catalogo-editor.css'],
})
export class AdicionaisEditorComponent {
  @Input() adicionais: Adicional[] = [];
  @Input() bloqueado = false;
  @Output() adicionaisChange = new EventEmitter<Adicional[]>();

  adicionar(): void {
    if (this.bloqueado || this.adicionais.length >= 20) return;
    this.adicionaisChange.emit([
      ...this.adicionais,
      { id: crypto.randomUUID(), nome: '', preco: '0.00', maximo: 1, ativo: true },
    ]);
  }

  alterar(id: string, campos: Partial<Adicional>): void {
    if (!this.bloqueado) {
      this.adicionaisChange.emit(
        this.adicionais.map((item) => (item.id === id ? { ...item, ...campos } : item)),
      );
    }
  }

  remover(id: string): void {
    if (!this.bloqueado)
      this.adicionaisChange.emit(this.adicionais.filter((item) => item.id !== id));
  }
}
