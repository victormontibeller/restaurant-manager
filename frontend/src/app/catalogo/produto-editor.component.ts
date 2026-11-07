import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { AdicionaisEditorComponent } from './adicionais-editor.component';
import { GruposEditorComponent } from './grupos-editor.component';
import { MidiaEditorComponent } from './midia-editor.component';
import { Categoria, Produto } from './modelos';

@Component({
  selector: 'app-produto-editor',
  imports: [AdicionaisEditorComponent, GruposEditorComponent, MidiaEditorComponent],
  template: `
    <form (submit)="salvar($event)" aria-label="Editor de produto">
      <h3>{{ novo ? 'Novo produto' : 'Editar produto' }}</h3>
      <p class="aviso">
        Nome, descrição, categoria, composição e sugestão são compartilhados por todas as unidades.
        Preço e disponibilidade são configurados separadamente por unidade.
      </p>
      <fieldset [disabled]="bloqueado || midiaBloqueada()" class="campos">
        <legend>Informações do produto</legend>
        <label for="produto-nome">Nome do produto</label>
        <input
          #nome
          id="produto-nome"
          required
          maxlength="120"
          [value]="rascunho.nome"
          (input)="rascunho.nome = nome.value"
        />
        <label for="produto-descricao">Descrição</label>
        <textarea
          #descricao
          id="produto-descricao"
          maxlength="2000"
          [value]="rascunho.descricao"
          (input)="rascunho.descricao = descricao.value"
        ></textarea>
        <label for="produto-categoria">Categoria do produto</label>
        <select
          #categoria
          id="produto-categoria"
          required
          [value]="rascunho.categoriaId"
          (change)="rascunho.categoriaId = categoria.value"
        >
          <option value="">Selecione uma categoria</option>
          @for (item of categorias; track item.id) {
            <option [value]="item.id" [selected]="item.id === rascunho.categoriaId">
              {{ item.nome }}{{ item.ativa ? '' : ' (inativa)' }}
            </option>
          }
        </select>
        <label for="produto-tipo">Tipo de produto</label>
        <select #tipo id="produto-tipo" [value]="rascunho.tipo" (change)="trocarTipo(tipo)">
          <option value="SIMPLES" [selected]="rascunho.tipo === 'SIMPLES'">Produto simples</option>
          <option value="COMBO" [selected]="rascunho.tipo === 'COMBO'">Combo personalizável</option>
        </select>
        @if (tipoPendente()) {
          <p class="aviso">Alterar o tipo remove a composição ou os adicionais deste rascunho.</p>
          <div class="acoes">
            <button type="button" (click)="confirmarTipo()">Alterar tipo e limpar composição</button>
            <button class="secundario" type="button" (click)="tipoPendente.set(null)">
              Manter tipo atual
            </button>
          </div>
        }
        <label class="check"
          ><input
            #ativo
            type="checkbox"
            [checked]="rascunho.ativo"
            (change)="rascunho.ativo = ativo.checked"
          />Produto ativo</label
        >
        <label class="check"
          ><input
            #sugerido
            type="checkbox"
            [checked]="rascunho.sugerido"
            (change)="rascunho.sugerido = sugerido.checked"
          />Mostrar nas sugestões da casa</label
        >
      </fieldset>
      @if (rascunho.tipo === 'SIMPLES') {
        <app-adicionais-editor
          [adicionais]="rascunho.adicionais"
          [bloqueado]="bloqueado || midiaBloqueada()"
          (adicionaisChange)="rascunho.adicionais = $event"
        />
      } @else {
        <app-grupos-editor
          [grupos]="rascunho.grupos"
          [componentes]="componentes"
          [bloqueado]="bloqueado || midiaBloqueada()"
          [temMaisComponentes]="temMaisComponentes"
          (gruposChange)="rascunho.grupos = $event"
          (maisComponentes)="maisComponentes.emit()"
        />
      }
      <app-midia-editor
        [produto]="rascunho"
        [novo]="novo"
        [midiaId]="rascunho.midiaId"
        [bloqueado]="bloqueado"
        (midiaIdChange)="rascunho.midiaId = $event"
        (bloqueio)="bloquearMidia($event)"
      />
      <div class="acoes">
        <button [disabled]="bloqueado || midiaBloqueada() || tipoPendente() !== null">
          {{ novo ? 'Criar produto' : 'Salvar produto' }}
        </button>
        <button
          class="secundario"
          type="button"
          (click)="cancelar.emit()"
          [disabled]="bloqueado || midiaBloqueada()"
        >
          Cancelar edição de produto
        </button>
      </div>
    </form>
  `,
  styleUrl: './catalogo.css',
})
export class ProdutoEditorComponent implements OnChanges {
  @Input({ required: true }) produto!: Produto;
  @Input() categorias: Categoria[] = [];
  @Input() componentes: Produto[] = [];
  @Input() temMaisComponentes = false;
  @Input() novo = false;
  @Input() bloqueado = false;
  @Output() salvarProduto = new EventEmitter<Produto>();
  @Output() cancelar = new EventEmitter<void>();
  @Output() maisComponentes = new EventEmitter<void>();
  @Output() bloqueio = new EventEmitter<boolean>();
  readonly midiaBloqueada = signal(false);
  readonly tipoPendente = signal<'SIMPLES' | 'COMBO' | null>(null);
  rascunho!: Produto;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['produto']) {
      this.rascunho = structuredClone(this.produto);
      this.tipoPendente.set(null);
    }
  }

  trocarTipo(select: HTMLSelectElement): void {
    const tipo = select.value === 'COMBO' ? 'COMBO' : 'SIMPLES';
    if (tipo !== this.rascunho.tipo) {
      if (this.rascunho.adicionais.length || this.rascunho.grupos.length)
        this.tipoPendente.set(tipo);
      else this.rascunho.tipo = tipo;
    }
    select.value = this.rascunho.tipo;
  }

  confirmarTipo(): void {
    const tipo = this.tipoPendente();
    if (!tipo || this.bloqueado || this.midiaBloqueada()) return;
    this.rascunho.tipo = tipo;
    this.rascunho.grupos = [];
    this.rascunho.adicionais = [];
    this.tipoPendente.set(null);
  }

  bloquearMidia(bloqueado: boolean): void {
    this.midiaBloqueada.set(bloqueado);
    this.bloqueio.emit(bloqueado);
  }

  salvar(event: Event): void {
    event.preventDefault();
    if (!this.bloqueado && !this.midiaBloqueada() && !this.tipoPendente())
      this.salvarProduto.emit(structuredClone(this.rascunho));
  }
}
