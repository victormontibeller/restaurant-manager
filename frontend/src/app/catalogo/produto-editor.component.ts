import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from '@angular/core';
import { HlmButton } from '../ui/button';
import { AdicionaisEditorComponent } from './adicionais-editor.component';
import { GruposEditorComponent } from './grupos-editor.component';
import { MidiaEditorComponent } from './midia-editor.component';
import { Categoria, Produto } from './modelos';

@Component({
  selector: 'app-produto-editor',
  imports: [HlmButton, AdicionaisEditorComponent, GruposEditorComponent, MidiaEditorComponent],
  template: `
    <div class="gc-editor-panel">
      <form
        class="gc-form"
        [attr.data-rascunho]="'produto-' + produto.id"
        (submit)="salvar($event)"
        aria-label="Editor de produto"
      >
        <div class="gc-sec-head">
          <span class="gc-sec-num">01 · FICHA DO PRODUTO</span>
          <span class="gc-sec-dotted"></span>
          <span class="gc-sec-sub">{{
            novo ? 'Novo cadastro' : 'Alteração global por tenant'
          }}</span>
        </div>

        <h3 class="gc-editor-titulo">{{ novo ? 'Novo produto' : 'Editar produto' }}</h3>

        <p class="gc-callout-amber">
          Nome, descrição, categoria, composição e sugestão são compartilhados por todas as
          unidades. Preço e disponibilidade são configurados separadamente por unidade.
        </p>

        <fieldset [disabled]="bloqueado || midiaBloqueada()" class="gc-fieldset-flat">
          <legend>Informações do produto</legend>

          <div class="gc-grid-2">
            <div class="gc-field gc-span-full">
              <label for="produto-nome">Nome do produto</label>
              <input
                #nome
                id="produto-nome"
                required
                maxlength="120"
                [value]="rascunho.nome"
                (input)="rascunho.nome = nome.value"
              />
            </div>

            <div class="gc-field gc-span-full">
              <label for="produto-descricao">Descrição</label>
              <textarea
                #descricao
                id="produto-descricao"
                maxlength="2000"
                [value]="rascunho.descricao"
                (input)="rascunho.descricao = descricao.value"
              ></textarea>
            </div>

            <div class="gc-field">
              <label for="produto-categoria">Categoria do produto</label>
              <div
                class="bistro-select-wrap"
                (focusout)="
                  !$any($event.currentTarget).contains($event.relatedTarget) &&
                    (menuCategoria.checked = false)
                "
              >
                <input #menuCategoria type="checkbox" hidden />
                <div
                  class="bistro-select-pill"
                  [class.open]="menuCategoria.checked"
                  [class.disabled]="bloqueado || midiaBloqueada()"
                  (mousedown)="!(bloqueado || midiaBloqueada()) && $event.preventDefault()"
                  (click)="
                    !(bloqueado || midiaBloqueada()) && categoria.focus();
                    !(bloqueado || midiaBloqueada()) &&
                      (menuCategoria.checked = !menuCategoria.checked)
                  "
                >
                  <svg
                    class="bistro-select-ico"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path
                      d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"
                    />
                    <circle cx="7" cy="7" r="1.5" />
                  </svg>
                  <span class="bistro-select-val" aria-hidden="true">
                    {{ nomeCategoriaSelecionada() || 'Selecione uma categoria' }}
                  </span>
                  <select
                    #categoria
                    id="produto-categoria"
                    class="bistro-select-native"
                    required
                    [value]="rascunho.categoriaId"
                    (keydown.enter)="
                      $event.preventDefault();
                      !(bloqueado || midiaBloqueada()) &&
                        (menuCategoria.checked = !menuCategoria.checked)
                    "
                    (keydown.space)="
                      $event.preventDefault();
                      !(bloqueado || midiaBloqueada()) &&
                        (menuCategoria.checked = !menuCategoria.checked)
                    "
                    (keydown.escape)="menuCategoria.checked = false"
                    (change)="menuCategoria.checked = false; rascunho.categoriaId = categoria.value"
                  >
                    <option value="">Selecione uma categoria</option>
                    @for (item of categorias; track item.id) {
                      <option [value]="item.id" [selected]="item.id === rascunho.categoriaId">
                        {{ item.nome }}{{ item.ativa ? '' : ' (inativa)' }}
                      </option>
                    }
                  </select>
                  <svg
                    class="bistro-select-chev"
                    [class.rot]="menuCategoria.checked"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                @if (menuCategoria.checked && !(bloqueado || midiaBloqueada())) {
                  <div class="bistro-select-popover" role="presentation">
                    <p class="bistro-select-popover-title">Categoria</p>
                    @for (item of categorias; track item.id) {
                      <button
                        type="button"
                        class="bistro-select-opt"
                        [class.on]="item.id === rascunho.categoriaId"
                        tabindex="-1"
                        (mousedown)="$event.preventDefault()"
                        (click)="
                          menuCategoria.checked = false;
                          categoria.value = item.id;
                          rascunho.categoriaId = item.id;
                          categoria.focus()
                        "
                      >
                        <span class="bistro-select-opt-main">
                          <span>{{ item.nome }}{{ item.ativa ? '' : ' (inativa)' }}</span>
                        </span>
                        @if (item.id === rascunho.categoriaId) {
                          <span class="bistro-select-opt-check" aria-hidden="true">
                            <svg width="15" height="15" viewBox="0 0 24 24">
                              <path
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2.8"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="m5 12.5 4.5 4.5L19 7.5"
                              />
                            </svg>
                          </span>
                        }
                      </button>
                    }
                  </div>
                }
              </div>
            </div>

            <div class="gc-field">
              <label for="produto-tipo">Tipo de produto</label>
              <div
                class="bistro-select-wrap"
                (focusout)="
                  !$any($event.currentTarget).contains($event.relatedTarget) &&
                    (menuTipo.checked = false)
                "
              >
                <input #menuTipo type="checkbox" hidden />
                <div
                  class="bistro-select-pill"
                  [class.open]="menuTipo.checked"
                  [class.disabled]="bloqueado || midiaBloqueada()"
                  (mousedown)="!(bloqueado || midiaBloqueada()) && $event.preventDefault()"
                  (click)="
                    !(bloqueado || midiaBloqueada()) && tipo.focus();
                    !(bloqueado || midiaBloqueada()) && (menuTipo.checked = !menuTipo.checked)
                  "
                >
                  <svg
                    class="bistro-select-ico"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <polygon points="12 2 2 7 12 12 22 7 12 2" />
                    <polyline points="2 12 12 17 22 12" />
                    <polyline points="2 17 12 22 22 17" />
                  </svg>
                  <span class="bistro-select-val" aria-hidden="true">
                    {{ nomeTipoSelecionado() }}
                  </span>
                  <select
                    #tipo
                    id="produto-tipo"
                    class="bistro-select-native"
                    [value]="rascunho.tipo"
                    (keydown.enter)="
                      $event.preventDefault();
                      !(bloqueado || midiaBloqueada()) && (menuTipo.checked = !menuTipo.checked)
                    "
                    (keydown.space)="
                      $event.preventDefault();
                      !(bloqueado || midiaBloqueada()) && (menuTipo.checked = !menuTipo.checked)
                    "
                    (keydown.escape)="menuTipo.checked = false"
                    (change)="menuTipo.checked = false; trocarTipo(tipo)"
                  >
                    <option value="SIMPLES" [selected]="rascunho.tipo === 'SIMPLES'">
                      Produto simples
                    </option>
                    <option value="COMBO" [selected]="rascunho.tipo === 'COMBO'">
                      Combo personalizável
                    </option>
                  </select>
                  <svg
                    class="bistro-select-chev"
                    [class.rot]="menuTipo.checked"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </div>
                @if (menuTipo.checked && !(bloqueado || midiaBloqueada())) {
                  <div class="bistro-select-popover" role="presentation">
                    <p class="bistro-select-popover-title">Modelo do item</p>
                    <button
                      type="button"
                      class="bistro-select-opt"
                      [class.on]="rascunho.tipo === 'SIMPLES'"
                      tabindex="-1"
                      (mousedown)="$event.preventDefault()"
                      (click)="
                        menuTipo.checked = false;
                        selecionarTipoValor('SIMPLES', tipo);
                        tipo.focus()
                      "
                    >
                      <span class="bistro-select-opt-main">
                        <span>Produto simples</span>
                      </span>
                      @if (rascunho.tipo === 'SIMPLES') {
                        <span class="bistro-select-opt-check" aria-hidden="true">
                          <svg width="15" height="15" viewBox="0 0 24 24">
                            <path
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.8"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="m5 12.5 4.5 4.5L19 7.5"
                            />
                          </svg>
                        </span>
                      }
                    </button>
                    <button
                      type="button"
                      class="bistro-select-opt"
                      [class.on]="rascunho.tipo === 'COMBO'"
                      tabindex="-1"
                      (mousedown)="$event.preventDefault()"
                      (click)="
                        menuTipo.checked = false;
                        selecionarTipoValor('COMBO', tipo);
                        tipo.focus()
                      "
                    >
                      <span class="bistro-select-opt-main">
                        <span>Combo personalizável</span>
                      </span>
                      @if (rascunho.tipo === 'COMBO') {
                        <span class="bistro-select-opt-check" aria-hidden="true">
                          <svg width="15" height="15" viewBox="0 0 24 24">
                            <path
                              fill="none"
                              stroke="currentColor"
                              stroke-width="2.8"
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              d="m5 12.5 4.5 4.5L19 7.5"
                            />
                          </svg>
                        </span>
                      }
                    </button>
                  </div>
                }
              </div>
            </div>
          </div>

          @if (tipoPendente()) {
            <div class="gc-callout-amber">
              <p>Alterar o tipo remove a composição ou os adicionais deste rascunho.</p>
              <div class="gc-acoes-inline">
                <button hlmBtn type="button" (click)="confirmarTipo()">
                  Alterar tipo e limpar composição
                </button>
                <button hlmBtn variant="outline" type="button" (click)="tipoPendente.set(null)">
                  Manter tipo atual
                </button>
              </div>
            </div>
          }

          <div class="gc-grid-2">
            <label class="gc-tactile-switch" [class.checked]="rascunho.ativo">
              <input
                #ativo
                type="checkbox"
                [checked]="rascunho.ativo"
                (change)="rascunho.ativo = ativo.checked"
              />
              <span>Produto ativo</span>
            </label>

            <label class="gc-tactile-switch" [class.checked]="rascunho.sugerido">
              <input
                #sugerido
                type="checkbox"
                [checked]="rascunho.sugerido"
                (change)="rascunho.sugerido = sugerido.checked"
              />
              <span>Mostrar nas sugestões da casa</span>
            </label>
          </div>
        </fieldset>

        @if (rascunho.tipo === 'SIMPLES') {
          <app-adicionais-editor
            [adicionais]="rascunho.adicionais"
            [bloqueado]="bloqueado || midiaBloqueada()"
            (adicionaisChange)="rascunho.adicionais = $event; marcarAlterado()"
          />
        } @else {
          <app-grupos-editor
            [grupos]="rascunho.grupos"
            [componentes]="componentes"
            [bloqueado]="bloqueado || midiaBloqueada()"
            [temMaisComponentes]="temMaisComponentes"
            (gruposChange)="rascunho.grupos = $event; marcarAlterado()"
            (maisComponentes)="maisComponentes.emit()"
          />
        }

        <app-midia-editor
          [produto]="rascunho"
          [novo]="novo"
          [midiaId]="rascunho.midiaId"
          [bloqueado]="bloqueado"
          (midiaIdChange)="rascunho.midiaId = $event; marcarAlterado()"
          (bloqueio)="bloquearMidia($event)"
          (salvo)="salvo.emit($event)"
        />

        <div class="gc-acoes-rodape">
          <button
            hlmBtn
            type="submit"
            [disabled]="bloqueado || midiaBloqueada() || tipoPendente() !== null"
          >
            {{ novo ? 'Criar produto' : 'Salvar produto' }}
          </button>
          <button
            hlmBtn
            variant="outline"
            type="button"
            (click)="cancelar.emit()"
            [disabled]="bloqueado || midiaBloqueada()"
          >
            Cancelar <span class="sr-only">edição de produto</span>
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./catalogo.css', './gestao-catalogo.css'],
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

  nomeCategoriaSelecionada(): string {
    const item = this.categorias.find((c) => c.id === this.rascunho?.categoriaId);
    if (!item) return '';
    return item.nome + (item.ativa ? '' : ' (inativa)');
  }

  nomeTipoSelecionado(): string {
    return this.rascunho?.tipo === 'COMBO' ? 'Combo personalizável' : 'Produto simples';
  }

  selecionarTipoValor(valor: 'SIMPLES' | 'COMBO', select: HTMLSelectElement): void {
    select.value = valor;
    this.trocarTipo(select);
  }
}
