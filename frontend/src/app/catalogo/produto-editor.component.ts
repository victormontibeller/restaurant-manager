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
  templateUrl: './produto-editor.component.html',
  styleUrls: ['./catalogo.css', './catalogo-editor.css'],
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
  @Output() salvo = new EventEmitter<string>();
  @Output() rascunhoAlterado = new EventEmitter<string>();
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

  marcarAlterado(): void {
    this.rascunhoAlterado.emit('produto-' + this.produto.id);
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
