import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { ContextoCarrinho, Escolha, LinhaCarrinho, SelecaoAdicional } from '../carrinho/modelos';
import { Adicional, GrupoPublico, OpcaoPublica, ProdutoPublico, moeda } from './modelos';
import { PreviaConfiguracaoService } from './previa-configuracao.service';

interface EscolhaRascunho extends Escolha {
  chave: string;
}

@Component({
  selector: 'app-configurador-produto',
  providers: [PreviaConfiguracaoService],
  template: `
    <section aria-labelledby="configurador-titulo">
      <h3 id="configurador-titulo">Configurar {{ produto.nome }}</h3>
      <p>{{ produto.descricao }}</p>
      <p>
        Preço base: {{ moeda(produto.preco) }}. O servidor calcula a composição completa no resumo do
        carrinho.
      </p>
      @if (!produto.disponivel) {
        <p class="aviso">Este produto está indisponível na unidade e no canal selecionados.</p>
      }
      @if (!permitirAdicionar) {
        <p class="aviso">
          Para adicionar ou alterar itens, conecte-se e escolha uma unidade e canal abertos.
        </p>
      }
      @if (erro()) {
        <p role="alert" class="erro">{{ erro() }}</p>
      }
      @if (composicaoDesatualizada()) {
        <p class="aviso">Uma escolha ou adicional da composição anterior mudou. Você pode escolher uma alternativa disponível ou limpar a composição para montá-la novamente.</p>
        <button type="button" (click)="limparComposicao()">Limpar escolhas e adicionais</button>
      }
      <form #formulario (submit)="guardar($event)" (input)="previa.invalidar()" (change)="previa.invalidar()">
        <fieldset [disabled]="!permitirAdicionar || !produto.disponivel" class="campos">
          <legend>Composição de uma unidade</legend>
          <label for="configurador-quantidade">Quantidade do produto</label>
          <input
            #quantidade
            id="configurador-quantidade"
            type="number"
            min="1"
            max="99"
            step="1"
            required
            [value]="quantidadeProduto"
            (input)="quantidadeProduto = +quantidade.value"
          />
          @if (produto.tipo === 'SIMPLES') {
            <fieldset>
              <legend>Adicionais por unidade do produto</legend>
              @for (adicional of adicionaisAtivos(produto.adicionais); track adicional.id) {
                <label [for]="'selecionar-' + adicional.id"
                  >{{ adicional.nome }} · {{ moeda(adicional.preco) }} cada (máximo
                  {{ adicional.maximo }})</label
                >
                <input
                  #quantidadeAdicional
                  [id]="'selecionar-' + adicional.id"
                  type="number"
                  min="0"
                  [max]="adicional.maximo"
                  step="1"
                  required
                  [value]="quantidadeAdicionalSelecionada(adicionais, adicional.id)"
                  (input)="
                    adicionais = selecionarAdicional(
                      adicionais,
                      adicional.id,
                      +quantidadeAdicional.value
                    )
                  "
                />
              } @empty {
                <p>Sem adicionais disponíveis.</p>
              }
            </fieldset>
          } @else {
            @for (grupo of produto.grupos; track grupo.id) {
              <fieldset class="campos">
                <legend>{{ grupo.nome }}</legend>
                <p>
                  Selecione entre {{ grupo.minimo }} e {{ grupo.maximo }} escolhas por combo.
                  Selecionadas: {{ totalGrupo(grupo.id) }}.
                </p>
                <ul aria-label="Opções disponíveis">
                  @for (opcao of grupo.opcoes; track opcao.id) {
                    <li>
                      {{ opcao.nome }} · Acréscimo {{ moeda(opcao.acrescimo) }} · Máximo
                      {{ opcao.limite }}{{ opcao.disponivel ? '' : ' · Indisponível' }}
                    </li>
                  }
                </ul>
                @for (escolha of escolhasDoGrupo(grupo.id); track escolha.chave; let indice = $index) {
                  <fieldset class="campos">
                    <legend>Escolha {{ indice + 1 }} de {{ grupo.nome }}</legend>
                    <label [for]="escolha.chave + '-opcao'">Opção da escolha</label>
                    <select
                      #opcao
                      [id]="escolha.chave + '-opcao'"
                      required
                      [value]="escolha.opcaoId"
                      (change)="alterarOpcao(escolha.chave, opcao.value)"
                    >
                      <option value="">Selecione uma opção</option>
                      @for (item of grupo.opcoes; track item.id) {
                        <option
                          [value]="item.id"
                          [disabled]="!item.disponivel"
                          [selected]="item.id === escolha.opcaoId"
                        >
                          {{ item.nome }}{{ item.disponivel ? '' : ' (indisponível)' }}
                        </option>
                      }
                    </select>
                    @if (escolha.opcaoId && !opcaoDisponivel(escolha)) {
                      <p class="aviso">
                        A escolha anterior não está disponível. Selecione uma alternativa ou remova esta
                        escolha.
                      </p>
                    }
                    <label [for]="escolha.chave + '-quantidade'">Quantidade desta escolha</label>
                    <input
                      #quantidadeEscolha
                      [id]="escolha.chave + '-quantidade'"
                      type="number"
                      min="1"
                      max="20"
                      step="1"
                      required
                      [value]="escolha.quantidade"
                      (input)="alterarEscolha(escolha.chave, { quantidade: +quantidadeEscolha.value })"
                    />
                    @if (opcaoDaEscolha(escolha); as selecionada) {
                      <fieldset>
                        <legend>Adicionais por unidade desta escolha</legend>
                        @for (adicional of adicionaisPermitidos(selecionada); track adicional.id) {
                          <label [for]="escolha.chave + '-' + adicional.id"
                            >{{ adicional.nome }} · {{ moeda(adicional.preco) }} cada (máximo
                            {{ adicional.maximo }})</label
                          >
                          <input
                            #extra
                            [id]="escolha.chave + '-' + adicional.id"
                            type="number"
                            min="0"
                            [max]="adicional.maximo"
                            step="1"
                            required
                            [value]="quantidadeAdicionalSelecionada(escolha.adicionais, adicional.id)"
                            (input)="
                              alterarEscolha(escolha.chave, {
                                adicionais: selecionarAdicional(
                                  escolha.adicionais,
                                  adicional.id,
                                  +extra.value
                                ),
                              })
                            "
                          />
                        } @empty {
                          <p>Sem adicionais permitidos nesta opção.</p>
                        }
                      </fieldset>
                    }
                    <button class="secundario" type="button" (click)="removerEscolha(escolha.chave)">
                      Remover escolha {{ indice + 1 }} de {{ grupo.nome }}
                    </button>
                  </fieldset>
                }
                <button
                  type="button"
                  (click)="adicionarEscolha(grupo)"
                  [disabled]="totalGrupo(grupo.id) >= grupo.maximo"
                >
                  Adicionar escolha de {{ grupo.nome }}
                </button>
                <p>
                  Para repetir uma opção com adicionais diferentes, adicione outra escolha e selecione a
                  opção desejada.
                </p>
              </fieldset>
            }
          }
          <button type="button" (click)="calcularPrevia(formulario)" [disabled]="previa.ocupado()">
            Calcular total desta configuração
          </button>
          @if (previa.ocupado()) {
            <p role="status">Consultando composição e valores no servidor…</p>
          }
          @if (previa.erro()) {
            <p role="alert" class="erro">{{ previa.erro() }}</p>
          }
          @if (previa.linha(); as calculada) {
            <div role="status">
              <p><strong>Prévia por unidade: {{ moeda(calculada.precoUnitario) }}</strong></p>
              <p>Prévia de {{ calculada.quantidade }} unidade(s): {{ moeda(calculada.subtotal) }}</p>
              <p>Esta prévia não reserva produtos. O resumo do carrinho consulta novamente a composição, os preços e a disponibilidade.</p>
            </div>
          }
          <button [disabled]="previa.ocupado()">{{ linha ? 'Atualizar composição no carrinho' : 'Adicionar ao carrinho' }}</button>
        </fieldset>
        <button class="secundario" type="button" (click)="cancelar.emit()">Fechar configuração</button>
      </form>
    </section>
  `,
  styleUrl: './catalogo.css',
})
export class ConfiguradorProdutoComponent implements OnChanges {
  @Input({ required: true }) produto!: ProdutoPublico;
  @Input() linha: LinhaCarrinho | null = null;
  @Input() contexto: ContextoCarrinho | null = null;
  @Input() permitirAdicionar = false;
  @Output() salvar = new EventEmitter<LinhaCarrinho>();
  @Output() cancelar = new EventEmitter<void>();
  readonly moeda = moeda;
  readonly erro = signal('');
  readonly previa = inject(PreviaConfiguracaoService);
  quantidadeProduto = 1;
  adicionais: SelecaoAdicional[] = [];
  escolhas: EscolhaRascunho[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.previa.invalidar();
    if (!changes['produto'] && !changes['linha']) return;
    this.quantidadeProduto = this.linha?.quantidade ?? 1;
    this.adicionais = structuredClone(this.linha?.adicionais ?? []);
    this.escolhas = (this.linha?.escolhas ?? []).map((item) => ({
      ...structuredClone(item),
      chave: crypto.randomUUID(),
    }));
    this.erro.set('');
  }

  adicionaisAtivos(adicionais: Adicional[]): Adicional[] {
    return adicionais.filter((item) => item.ativo);
  }

  quantidadeAdicionalSelecionada(adicionais: SelecaoAdicional[], id: string): number {
    return adicionais.find((item) => item.adicionalId === id)?.quantidade ?? 0;
  }

  selecionarAdicional(
    adicionais: SelecaoAdicional[],
    adicionalId: string,
    quantidade: number,
  ): SelecaoAdicional[] {
    const demais = adicionais.filter((item) => item.adicionalId !== adicionalId);
    return quantidade > 0 ? [...demais, { adicionalId, quantidade }] : demais;
  }

  escolhasDoGrupo(id: string): EscolhaRascunho[] {
    return this.escolhas.filter((item) => item.grupoId === id);
  }

  totalGrupo(id: string): number {
    return this.escolhasDoGrupo(id).reduce((total, item) => total + item.quantidade, 0);
  }

  adicionarEscolha(grupo: GrupoPublico): void {
    if (this.totalGrupo(grupo.id) >= grupo.maximo) return;
    this.previa.invalidar();
    this.escolhas = [
      ...this.escolhas,
      { chave: crypto.randomUUID(), grupoId: grupo.id, opcaoId: '', quantidade: 1, adicionais: [] },
    ];
  }

  alterarOpcao(chave: string, opcaoId: string): void {
    this.alterarEscolha(chave, { opcaoId, adicionais: [] });
  }

  alterarEscolha(chave: string, campos: Partial<Escolha>): void {
    this.previa.invalidar();
    this.escolhas = this.escolhas.map((item) =>
      item.chave === chave ? { ...item, ...campos } : item,
    );
  }

  removerEscolha(chave: string): void {
    this.previa.invalidar();
    this.escolhas = this.escolhas.filter((item) => item.chave !== chave);
  }

  opcaoDaEscolha(escolha: Escolha): OpcaoPublica | undefined {
    return this.produto.grupos
      .find((item) => item.id === escolha.grupoId)
      ?.opcoes.find((item) => item.id === escolha.opcaoId);
  }

  opcaoDisponivel(escolha: Escolha): boolean {
    return this.opcaoDaEscolha(escolha)?.disponivel ?? false;
  }

  adicionaisPermitidos(opcao: OpcaoPublica): Adicional[] {
    return opcao.adicionais.filter(
      (item) => item.ativo && opcao.adicionaisPermitidos.includes(item.id),
    );
  }

  composicaoDesatualizada(): boolean {
    const adicionaisAtivos = new Set(
      this.adicionaisAtivos(this.produto.adicionais).map((item) => item.id),
    );
    if (this.adicionais.some((item) => !adicionaisAtivos.has(item.adicionalId))) return true;
    return this.escolhas.some((escolha) => {
      const opcao = this.opcaoDaEscolha(escolha);
      if (!escolha.opcaoId) return false;
      if (!opcao?.disponivel) return true;
      const permitidos = new Set(this.adicionaisPermitidos(opcao).map((item) => item.id));
      return escolha.adicionais.some((item) => !permitidos.has(item.adicionalId));
    });
  }

  limparComposicao(): void {
    this.previa.invalidar();
    this.adicionais = [];
    this.escolhas = [];
    this.erro.set('Composição anterior removida. Escolha novamente os itens desejados.');
  }

  guardar(event: Event): void {
    event.preventDefault();
    const linha = this.montarLinha();
    if (linha) this.salvar.emit(linha);
  }

  async calcularPrevia(formulario: HTMLFormElement): Promise<void> {
    if (!formulario.reportValidity() || !this.contexto || this.previa.ocupado()) return;
    const linha = this.montarLinha();
    if (linha) await this.previa.calcular(this.contexto, linha);
  }

  private montarLinha(): LinhaCarrinho | null {
    this.erro.set('');
    if (!this.permitirAdicionar || !this.produto.disponivel) return null;
    if (this.composicaoDesatualizada()) {
      this.erro.set('Revise ou limpe os adicionais e escolhas que não estão mais disponíveis.');
      return null;
    }
    if (this.produto.tipo === 'COMBO') {
      for (const grupo of this.produto.grupos) {
        const total = this.totalGrupo(grupo.id);
        if (total < grupo.minimo || total > grupo.maximo) {
          this.erro.set('Confira os limites do grupo ' + grupo.nome + '.');
          return null;
        }
        for (const opcao of grupo.opcoes) {
          const escolhidas = this.escolhasDoGrupo(grupo.id).filter(
            (item) => item.opcaoId === opcao.id,
          );
          if (escolhidas.reduce((soma, item) => soma + item.quantidade, 0) > opcao.limite) {
            this.erro.set(
              'A opção ' + opcao.nome + ' excede o limite do grupo ' + grupo.nome + '.',
            );
            return null;
          }
        }
      }
      if (this.escolhas.some((item) => !this.opcaoDisponivel(item))) {
        this.erro.set(
          'Revise as escolhas indisponíveis antes de continuar. Nenhuma escolha foi substituída.',
        );
        return null;
      }
    }
    return {
      id: this.linha?.id ?? crypto.randomUUID(),
      produtoId: this.produto.id,
      quantidade: this.quantidadeProduto,
      adicionais: structuredClone(this.adicionais),
      escolhas: this.escolhas.map(({ chave: _chave, ...escolha }) => structuredClone(escolha)),
    };
  }
}
