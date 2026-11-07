import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Adicional } from './modelos';

@Component({
  selector: 'app-adicionais-editor',
  template: `
    <div aria-label="Adicionais do produto">
      <h4>Adicionais</h4>
      <p>
        O preço do adicional vale por unidade escolhida. A oferta do produto principal tem seu preço
        próprio em cada unidade.
      </p>
      @for (adicional of adicionais; track adicional.id; let indice = $index) {
        <fieldset [disabled]="bloqueado" class="campos">
          <legend>Adicional {{ indice + 1 }}</legend>
          <label [for]="adicional.id + '-nome'">Nome do adicional</label>
          <input
            #nome
            [id]="adicional.id + '-nome'"
            required
            maxlength="120"
            [value]="adicional.nome"
            (input)="alterar(adicional.id, { nome: nome.value })"
          />
          <label [for]="adicional.id + '-preco'">Preço do adicional (R$)</label>
          <input
            #preco
            [id]="adicional.id + '-preco'"
            type="number"
            min="0"
            max="999999.99"
            step="0.01"
            required
            [value]="adicional.preco"
            (input)="alterar(adicional.id, { preco: preco.value })"
          />
          <label [for]="adicional.id + '-maximo'">Máximo por produto</label>
          <input
            #maximo
            [id]="adicional.id + '-maximo'"
            type="number"
            min="1"
            max="10"
            step="1"
            required
            [value]="adicional.maximo"
            (input)="alterar(adicional.id, { maximo: +maximo.value })"
          />
          <label class="check"
            ><input
              #ativo
              type="checkbox"
              [checked]="adicional.ativo"
              (change)="alterar(adicional.id, { ativo: ativo.checked })"
            />Adicional ativo</label
          >
          <button class="secundario" type="button" (click)="remover(adicional.id)">
            Remover adicional {{ indice + 1 }}
          </button>
        </fieldset>
      } @empty {
        <p>Nenhum adicional cadastrado.</p>
      }
      <button type="button" (click)="adicionar()" [disabled]="bloqueado || adicionais.length >= 20">
        Adicionar adicional
      </button>
      <p>{{ adicionais.length }} de 20 adicionais.</p>
    </div>
  `,
  styleUrl: './catalogo.css',
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
