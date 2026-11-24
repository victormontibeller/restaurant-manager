import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HlmButton } from '../ui/button';
import { Adicional } from './modelos';

@Component({
  selector: 'app-adicionais-editor',
  imports: [HlmButton],
  template: `
    <div class="gc-form" aria-label="Adicionais do produto">
      <div class="gc-sec-head">
        <span class="gc-sec-num">02 · ADICIONAIS</span>
        <span class="gc-sec-dotted"></span>
        <span class="gc-sec-sub">{{ adicionais.length }} de 20 adicionais.</span>
      </div>
      <h4 class="sr-only">Adicionais</h4>
      <p class="gc-nota">
        O preço do adicional vale por unidade escolhida. A oferta do produto principal tem seu preço
        próprio em cada unidade.
      </p>

      @for (adicional of adicionais; track adicional.id; let indice = $index) {
        <fieldset [disabled]="bloqueado" class="gc-subcard">
          <legend>Adicional {{ indice + 1 }}</legend>
          <div class="gc-field">
            <label [for]="adicional.id + '-nome'">Nome do adicional</label>
            <input
              #nome
              [id]="adicional.id + '-nome'"
              required
              maxlength="120"
              [value]="adicional.nome"
              (input)="alterar(adicional.id, { nome: nome.value })"
            />
          </div>
          <div class="gc-grid-pair">
            <div class="gc-field">
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
            </div>
            <div class="gc-field">
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
            </div>
          </div>
          <div class="gc-grid-2" style="align-items: center">
            <label class="gc-tactile-switch" [class.checked]="adicional.ativo">
              <input
                #ativo
                type="checkbox"
                [checked]="adicional.ativo"
                (change)="alterar(adicional.id, { ativo: ativo.checked })"
              />
              <span>Adicional ativo</span>
            </label>
            <button
              hlmBtn
              variant="outline"
              class="btn-cancelar-outline"
              type="button"
              (click)="remover(adicional.id)"
            >
              Remover <span class="sr-only">adicional {{ indice + 1 }}</span>
            </button>
          </div>
        </fieldset>
      } @empty {
        <p class="gc-nota">Nenhum adicional cadastrado.</p>
      }

      <div class="gc-acoes-inline">
        <button
          hlmBtn
          variant="outline"
          type="button"
          (click)="adicionar()"
          [disabled]="bloqueado || adicionais.length >= 20"
        >
          Adicionar adicional
        </button>
      </div>
    </div>
  `,
  styleUrls: ['./catalogo.css', './gestao-catalogo.css'],
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
