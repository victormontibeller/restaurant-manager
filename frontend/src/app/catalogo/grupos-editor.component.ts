import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HlmButton } from '../ui/button';
import { Adicional, Grupo, Opcao, Produto } from './modelos';

@Component({
  selector: 'app-grupos-editor',
  imports: [HlmButton],
  template: `
    <div class="gc-form" aria-label="Composição do combo">
      <div class="gc-sec-head">
        <span class="gc-sec-num">02 · GRUPOS DO COMBO</span>
        <span class="gc-sec-dotted"></span>
        <span class="gc-sec-sub">
          {{ componentes.length }}
          {{ componentes.length === 1 ? 'produto simples carregado' : 'produtos simples carregados'
          }}{{ temMaisComponentes ? '; há mais componentes para consultar.' : '.' }}
        </span>
      </div>
      <h4 class="sr-only">Grupos e escolhas do combo</h4>
      <p class="gc-nota">
        O valor do combo soma seu preço base, os acréscimos das escolhas e seus adicionais. O preço
        avulso dos componentes não é somado. Os limites valem para uma unidade do combo.
      </p>

      @for (grupo of grupos; track grupo.id; let indice = $index) {
        <fieldset [disabled]="bloqueado" class="gc-subcard">
          <legend>Grupo {{ indice + 1 }}</legend>
          <div class="gc-field">
            <label [for]="grupo.id + '-nome'">Nome do grupo</label>
            <input
              #nome
              [id]="grupo.id + '-nome'"
              required
              maxlength="120"
              [value]="grupo.nome"
              (input)="alterarGrupo(grupo.id, { nome: nome.value })"
            />
          </div>

          <div class="gc-grid-pair">
            <div class="gc-field">
              <label [for]="grupo.id + '-minimo'">Quantidade mínima</label>
              <input
                #minimo
                [id]="grupo.id + '-minimo'"
                type="number"
                min="0"
                max="20"
                step="1"
                required
                [value]="grupo.minimo"
                (input)="alterarGrupo(grupo.id, { minimo: +minimo.value })"
              />
            </div>
            <div class="gc-field">
              <label [for]="grupo.id + '-maximo'">Quantidade máxima</label>
              <input
                #maximo
                [id]="grupo.id + '-maximo'"
                type="number"
                min="1"
                max="20"
                step="1"
                required
                [value]="grupo.maximo"
                (input)="alterarGrupo(grupo.id, { maximo: +maximo.value })"
              />
            </div>
          </div>

          @for (opcao of grupo.opcoes; track opcao.id; let opcaoIndice = $index) {
            <fieldset class="gc-subcard-nested">
              <legend>Opção {{ opcaoIndice + 1 }} de {{ grupo.nome || 'novo grupo' }}</legend>

              <div class="gc-field">
                <label [for]="opcao.id + '-produto'">Produto da opção</label>
                <div
                  class="bistro-select-wrap"
                  (focusout)="
                    !$any($event.currentTarget).contains($event.relatedTarget) &&
                      (menuOpProd.checked = false)
                  "
                >
                  <input #menuOpProd type="checkbox" hidden />
                  <div
                    class="bistro-select-pill"
                    [class.open]="menuOpProd.checked"
                    [class.disabled]="bloqueado"
                    (mousedown)="!bloqueado && $event.preventDefault()"
                    (click)="
                      !bloqueado && produto.focus();
                      !bloqueado && (menuOpProd.checked = !menuOpProd.checked)
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
                      <circle cx="12" cy="12" r="9" />
                      <circle cx="12" cy="12" r="4" />
                    </svg>
                    <span class="bistro-select-val" aria-hidden="true">
                      {{ nomeComponente(opcao.produtoId) || 'Selecione um produto simples' }}
                    </span>
                    <select
                      #produto
                      [id]="opcao.id + '-produto'"
                      class="bistro-select-native"
                      required
                      [value]="opcao.produtoId"
                      (keydown.enter)="
                        $event.preventDefault();
                        !bloqueado && (menuOpProd.checked = !menuOpProd.checked)
                      "
                      (keydown.space)="
                        $event.preventDefault();
                        !bloqueado && (menuOpProd.checked = !menuOpProd.checked)
                      "
                      (keydown.escape)="menuOpProd.checked = false"
                      (change)="
                        menuOpProd.checked = false;
                        selecionarProduto(grupo.id, opcao.id, produto.value)
                      "
                    >
                      <option value="">Selecione um produto simples</option>
                      @for (componente of componentes; track componente.id) {
                        <option
                          [value]="componente.id"
                          [selected]="componente.id === opcao.produtoId"
                        >
                          {{ componente.nome }}{{ componente.ativo ? '' : ' (inativo)' }}
                        </option>
                      }
                    </select>
                    <svg
                      class="bistro-select-chev"
                      [class.rot]="menuOpProd.checked"
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
                  @if (menuOpProd.checked && !bloqueado) {
                    <div class="bistro-select-popover" role="presentation">
                      <p class="bistro-select-popover-title">Componente simples</p>
                      @for (componente of componentes; track componente.id) {
                        <button
                          type="button"
                          class="bistro-select-opt"
                          [class.on]="componente.id === opcao.produtoId"
                          tabindex="-1"
                          (mousedown)="$event.preventDefault()"
                          (click)="
                            menuOpProd.checked = false;
                            produto.value = componente.id;
                            selecionarProduto(grupo.id, opcao.id, componente.id);
                            produto.focus()
                          "
                        >
                          <span class="bistro-select-opt-main">
                            <span>
                              {{ componente.nome }}{{ componente.ativo ? '' : ' (inativo)' }}
                            </span>
                          </span>
                          @if (componente.id === opcao.produtoId) {
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

              <div class="gc-grid-pair">
                <div class="gc-field">
                  <label [for]="opcao.id + '-acrescimo'">Acréscimo por escolha (R$)</label>
                  <input
                    #acrescimo
                    [id]="opcao.id + '-acrescimo'"
                    type="number"
                    min="0"
                    max="999999.99"
                    step="0.01"
                    required
                    [value]="opcao.acrescimo"
                    (input)="alterarOpcao(grupo.id, opcao.id, { acrescimo: acrescimo.value })"
                  />
                </div>
                <div class="gc-field">
                  <label [for]="opcao.id + '-limite'">Limite desta opção no grupo</label>
                  <input
                    #limite
                    [id]="opcao.id + '-limite'"
                    type="number"
                    min="1"
                    max="20"
                    step="1"
                    required
                    [value]="opcao.limite"
                    (input)="alterarOpcao(grupo.id, opcao.id, { limite: +limite.value })"
                  />
                </div>
              </div>

              <fieldset class="gc-fieldset-flat">
                <legend>Adicionais permitidos nesta opção</legend>
                <div class="gc-chips-wrap">
                  @for (adicional of adicionais(opcao.produtoId); track adicional.id) {
                    <label
                      class="gc-check-chip"
                      [class.on]="opcao.adicionaisPermitidos.includes(adicional.id)"
                    >
                      <input
                        #permitido
                        type="checkbox"
                        [checked]="opcao.adicionaisPermitidos.includes(adicional.id)"
                        (change)="permitir(grupo.id, opcao, adicional.id, permitido.checked)"
                      />
                      <span>{{ adicional.nome }}</span>
                    </label>
                  } @empty {
                    <p class="gc-nota">Este componente não possui adicionais ativos.</p>
                  }
                </div>
              </fieldset>

              <div class="gc-acoes-inline">
                <button
                  hlmBtn
                  variant="outline"
                  class="btn-cancelar-outline"
                  type="button"
                  (click)="removerOpcao(grupo.id, opcao.id)"
                >
                  Remover <span class="sr-only">opção {{ opcaoIndice + 1 }}</span>
                </button>
              </div>
            </fieldset>
          }

          <div class="gc-acoes-inline">
            <button
              hlmBtn
              variant="outline"
              type="button"
              (click)="adicionarOpcao(grupo.id)"
              [disabled]="grupo.opcoes.length >= 20"
            >
              Adicionar opção <span class="sr-only">ao grupo {{ indice + 1 }}</span>
            </button>
            <button
              hlmBtn
              variant="outline"
              class="btn-cancelar-outline"
              type="button"
              (click)="removerGrupo(grupo.id)"
            >
              Remover <span class="sr-only">grupo {{ indice + 1 }}</span>
            </button>
          </div>
        </fieldset>
      }

      <div class="gc-acoes-inline">
        <button
          hlmBtn
          variant="outline"
          type="button"
          (click)="adicionarGrupo()"
          [disabled]="bloqueado || grupos.length >= 10"
        >
          Adicionar grupo
        </button>
        @if (temMaisComponentes) {
          <button
            hlmBtn
            variant="secondary"
            type="button"
            (click)="maisComponentes.emit()"
            [disabled]="bloqueado"
          >
            Carregar mais componentes
          </button>
        }
      </div>
    </div>
  `,
  styleUrls: ['./catalogo.css', './gestao-catalogo.css'],
})
export class GruposEditorComponent {
  @Input() grupos: Grupo[] = [];
  @Input() componentes: Produto[] = [];
  @Input() bloqueado = false;
  @Input() temMaisComponentes = false;
  @Output() gruposChange = new EventEmitter<Grupo[]>();
  @Output() maisComponentes = new EventEmitter<void>();

  adicionarGrupo(): void {
    if (this.bloqueado || this.grupos.length >= 10) return;
    this.gruposChange.emit([
      ...this.grupos,
      { id: crypto.randomUUID(), nome: '', minimo: 1, maximo: 1, opcoes: [] },
    ]);
  }

  alterarGrupo(id: string, campos: Partial<Grupo>): void {
    if (!this.bloqueado)
      this.gruposChange.emit(
        this.grupos.map((item) => (item.id === id ? { ...item, ...campos } : item)),
      );
  }

  removerGrupo(id: string): void {
    if (!this.bloqueado) this.gruposChange.emit(this.grupos.filter((item) => item.id !== id));
  }

  adicionarOpcao(grupoId: string): void {
    const grupo = this.grupos.find((item) => item.id === grupoId);
    if (!grupo || grupo.opcoes.length >= 20) return;
    this.alterarGrupo(grupoId, {
      opcoes: [
        ...grupo.opcoes,
        {
          id: crypto.randomUUID(),
          produtoId: '',
          acrescimo: '0.00',
          limite: 1,
          adicionaisPermitidos: [],
        },
      ],
    });
  }

  alterarOpcao(grupoId: string, opcaoId: string, campos: Partial<Opcao>): void {
    const grupo = this.grupos.find((item) => item.id === grupoId);
    if (grupo)
      this.alterarGrupo(grupoId, {
        opcoes: grupo.opcoes.map((item) => (item.id === opcaoId ? { ...item, ...campos } : item)),
      });
  }

  selecionarProduto(grupoId: string, opcaoId: string, produtoId: string): void {
    this.alterarOpcao(grupoId, opcaoId, { produtoId, adicionaisPermitidos: [] });
  }

  removerOpcao(grupoId: string, opcaoId: string): void {
    const grupo = this.grupos.find((item) => item.id === grupoId);
    if (grupo)
      this.alterarGrupo(grupoId, { opcoes: grupo.opcoes.filter((item) => item.id !== opcaoId) });
  }

  adicionais(produtoId: string): Adicional[] {
    return (
      this.componentes
        .find((item) => item.id === produtoId)
        ?.adicionais.filter((item) => item.ativo) ?? []
    );
  }

  permitir(grupoId: string, opcao: Opcao, adicionalId: string, permitido: boolean): void {
    this.alterarOpcao(grupoId, opcao.id, {
      adicionaisPermitidos: permitido
        ? [...opcao.adicionaisPermitidos, adicionalId]
        : opcao.adicionaisPermitidos.filter((id) => id !== adicionalId),
    });
  }

  nomeComponente(produtoId: string): string {
    const item = this.componentes.find((c) => c.id === produtoId);
    if (!item) return '';
    return item.nome + (item.ativo ? '' : ' (inativo)');
  }
}
