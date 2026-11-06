import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Adicional, Grupo, Opcao, Produto } from './modelos';

@Component({
  selector: 'app-grupos-editor',
  template: `
    <div aria-label="Composição do combo">
      <h4>Grupos e escolhas do combo</h4>
      <p>
        O valor do combo soma seu preço base, os acréscimos das escolhas e seus adicionais. O preço
        avulso dos componentes não é somado. Os limites valem para uma unidade do combo.
      </p>
      @for (grupo of grupos; track grupo.id; let indice = $index) {
        <fieldset [disabled]="bloqueado" class="campos">
          <legend>Grupo {{ indice + 1 }}</legend>
          <label [for]="grupo.id + '-nome'">Nome do grupo</label>
          <input
            #nome
            [id]="grupo.id + '-nome'"
            required
            maxlength="120"
            [value]="grupo.nome"
            (input)="alterarGrupo(grupo.id, { nome: nome.value })"
          />
          <div class="linha">
            <div>
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
            <div>
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
            <fieldset class="campos">
              <legend>Opção {{ opcaoIndice + 1 }} de {{ grupo.nome || 'novo grupo' }}</legend>
              <label [for]="opcao.id + '-produto'">Produto da opção</label>
              <select
                #produto
                [id]="opcao.id + '-produto'"
                required
                [value]="opcao.produtoId"
                (change)="selecionarProduto(grupo.id, opcao.id, produto.value)"
              >
                <option value="">Selecione um produto simples</option>
                @for (componente of componentes; track componente.id) {
                  <option [value]="componente.id" [selected]="componente.id === opcao.produtoId">
                    {{ componente.nome }}{{ componente.ativo ? '' : ' (inativo)' }}
                  </option>
                }
              </select>
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
              <fieldset>
                <legend>Adicionais permitidos nesta opção</legend>
                @for (adicional of adicionais(opcao.produtoId); track adicional.id) {
                  <label class="check"
                    ><input
                      #permitido
                      type="checkbox"
                      [checked]="opcao.adicionaisPermitidos.includes(adicional.id)"
                      (change)="permitir(grupo.id, opcao, adicional.id, permitido.checked)"
                    />{{ adicional.nome }}</label
                  >
                } @empty {
                  <p>Este componente não possui adicionais ativos.</p>
                }
              </fieldset>
              <button class="secundario" type="button" (click)="removerOpcao(grupo.id, opcao.id)">
                Remover opção {{ opcaoIndice + 1 }}
              </button>
            </fieldset>
          }
          <button
            type="button"
            (click)="adicionarOpcao(grupo.id)"
            [disabled]="grupo.opcoes.length >= 20"
          >
            Adicionar opção ao grupo {{ indice + 1 }}
          </button>
          <button class="secundario" type="button" (click)="removerGrupo(grupo.id)">
            Remover grupo {{ indice + 1 }}
          </button>
        </fieldset>
      }
      <div class="acoes">
        <button type="button" (click)="adicionarGrupo()" [disabled]="bloqueado || grupos.length >= 10">
          Adicionar grupo
        </button>
        @if (temMaisComponentes) {
          <button
            class="secundario"
            type="button"
            (click)="maisComponentes.emit()"
            [disabled]="bloqueado"
          >
            Carregar mais componentes
          </button>
        }
      </div>
      <p>
        {{ componentes.length }} produtos simples carregados{{
          temMaisComponentes ? '; há mais componentes para consultar.' : '.'
        }}
      </p>
    </div>
  `,
  styleUrl: './catalogo.css',
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
}
