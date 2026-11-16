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
import {
  Adicional,
  GrupoPublico,
  OpcaoPublica,
  PONTOS_CARNE,
  ProdutoPublico,
  mensagemErro,
  moeda,
  produtoExigePontoCarne,
  produtoIndustrializadoBebida,
} from './modelos';
import { PreviaConfiguracaoService } from './previa-configuracao.service';

export interface DetalhesItemConfigurado {
  pontoCarne?: string;
  observacaoItem?: string;
  resumoCustomizacao?: string;
  aceitaObservacao: boolean;
  permitePontoCarne: boolean;
}

interface EscolhaRascunho extends Escolha {
  chave: string;
}

@Component({
  selector: 'app-configurador-produto',
  providers: [PreviaConfiguracaoService],
  template: `
    <section class="configurador-bistro dlg-shell" aria-labelledby="configurador-titulo">
      <div class="configurador-grade dlg-grid">
        <div class="configurador-resumo-prato dlg-media">
          <div class="ph">
            @if (produto.midiaId) {
              <img
                class="configurador-foto"
                [src]="'/api/v1/midias/' + produto.midiaId"
                [alt]="produto.nome"
                decoding="async"
              />
            } @else {
              <div class="configurador-monograma" aria-hidden="true">
                <span class="configurador-monograma-letra">{{ produto.nome.slice(0, 1) }}</span>
              </div>
            }
          </div>
          <div class="info">
            <p class="kicker">
              {{ produto.tipo === 'COMBO' ? 'Combo para montar' : 'Prato da casa' }}
            </p>
            <h3 id="configurador-titulo">
              <span class="sr-only">Configurar </span>{{ produto.nome }}
            </h3>
            <p class="configurador-descricao">
              {{ produto.descricao }} Preço base: {{ moeda(produto.preco) }}.
            </p>
            <div class="how">
              <b>Como funciona</b>
              Escolha as opções e adicionais desejados. Acréscimos aparecem ao lado de cada opção e
              o total é conferido pelo restaurante no carrinho.
            </div>
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
              <p class="aviso">
                Uma escolha ou adicional da composição anterior mudou. Você pode escolher uma
                alternativa disponível ou limpar a composição para montá-la novamente.
              </p>
              <button class="secundario" type="button" (click)="limparComposicao()">
                Limpar escolhas e adicionais
              </button>
            }
          </div>
        </div>

        <form
          #formulario
          class="configurador-formulario dlg-main"
          (submit)="guardar($event)"
          (input)="previa.invalidar()"
          (change)="previa.invalidar()"
        >
          <div class="dlg-top">
            <div class="progress">
              <span class="bars" aria-hidden="true"><i></i><i></i></span>
              <span>{{
                produto.tipo === 'COMBO'
                  ? produto.grupos.length +
                    (produto.grupos.length === 1 ? ' etapa de escolha' : ' etapas de escolha')
                  : 'Personalize seu pedido'
              }}</span>
            </div>
            <button class="x" type="button" (click)="cancelar.emit()">
              <span class="sr-only">Fechar configuração</span>
              <span aria-hidden="true">✕</span>
            </button>
          </div>

          <fieldset
            [disabled]="!permitirAdicionar || !produto.disponivel"
            class="campos configurador-campos dlg-body"
          >
            <legend class="sr-only">Composição de uma unidade</legend>

            @if (produto.tipo === 'SIMPLES') {
              <fieldset class="bloco-adicionais extras">
                <legend class="extras-t">Adicionais por unidade do produto</legend>
                @for (adicional of adicionaisAtivos(produto.adicionais); track adicional.id) {
                  <div class="linha-adicional extra">
                    <label [for]="'selecionar-' + adicional.id">
                      <b>{{ adicional.nome }}</b>
                      <small
                        >+ {{ moeda(adicional.preco) }} cada · até {{ adicional.maximo }}</small
                      >
                      <span class="sr-only">
                        {{ adicional.nome }} · {{ moeda(adicional.preco) }} cada (máximo
                        {{ adicional.maximo }})
                      </span>
                    </label>
                    <div class="controle-quantidade stepper">
                      <button
                        class="btn-passo"
                        type="button"
                        tabindex="-1"
                        aria-hidden="true"
                        [disabled]="quantidadeAdicionalSelecionada(adicionais, adicional.id) <= 0"
                        (click)="
                          adicionais = selecionarAdicional(
                            adicionais,
                            adicional.id,
                            quantidadeAdicionalSelecionada(adicionais, adicional.id) - 1
                          );
                          previa.invalidar()
                        "
                      >
                        −
                      </button>
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
                      <button
                        class="btn-passo"
                        type="button"
                        tabindex="-1"
                        aria-hidden="true"
                        [disabled]="
                          quantidadeAdicionalSelecionada(adicionais, adicional.id) >=
                          adicional.maximo
                        "
                        (click)="
                          adicionais = selecionarAdicional(
                            adicionais,
                            adicional.id,
                            quantidadeAdicionalSelecionada(adicionais, adicional.id) + 1
                          );
                          previa.invalidar()
                        "
                      >
                        +
                      </button>
                    </div>
                  </div>
                } @empty {
                  <p>Sem adicionais disponíveis.</p>
                }
              </fieldset>
            } @else {
              @for (grupo of produto.grupos; track grupo.id) {
                <fieldset class="campos grupo-combo">
                  <legend class="sr-only">{{ grupo.nome }}</legend>
                  <div class="group-h">
                    <h3>
                      <span class="step-n" aria-hidden="true">✓</span>
                      {{ grupo.nome }}
                    </h3>
                    <span class="req">
                      Obrigatório · {{ totalGrupo(grupo.id) }} de {{ grupo.maximo }}
                    </span>
                  </div>
                  <p class="regra-grupo">
                    @if (grupo.minimo === grupo.maximo) {
                      Selecione {{ grupo.minimo }}
                      {{ grupo.maximo === 1 ? 'escolha' : 'escolhas' }} por combo.
                    } @else {
                      Selecione entre {{ grupo.minimo }} e {{ grupo.maximo }}
                      {{ grupo.maximo === 1 ? 'escolha' : 'escolhas' }} por combo.
                    }
                    Selecionadas: {{ totalGrupo(grupo.id) }}.
                  </p>
                  <ul class="opcoes-catalogo sr-only" aria-label="Opções disponíveis">
                    @for (opcao of grupo.opcoes; track opcao.id) {
                      <li>
                        {{ opcao.nome }} · Acréscimo {{ moeda(opcao.acrescimo) }} · Máximo
                        {{ opcao.limite }}{{ opcao.disponivel ? '' : ' · Indisponível' }}
                      </li>
                    }
                  </ul>

                  @if (!escolhasDoGrupo(grupo.id).length) {
                    <div class="opts grade-opcoes-tateis" aria-hidden="true">
                      @for (item of grupo.opcoes; track item.id) {
                        <div
                          class="opt cartao-opcao-tatil"
                          [class.off]="!item.disponivel"
                          (click)="
                            item.disponivel && adicionarEscolha(grupo);
                            item.disponivel &&
                              escolhasDoGrupo(grupo.id).length &&
                              alterarOpcao(escolhasDoGrupo(grupo.id)[0].chave, item.id)
                          "
                        >
                          <span class="radio"></span>
                          <span>
                            <b>{{ item.nome }}</b>
                            <small>{{
                              item.disponivel
                                ? 'Toque para selecionar · limite ' + item.limite
                                : 'Indisponível nesta unidade agora'
                            }}</small>
                          </span>
                          <span class="delta" [class.inc]="item.acrescimo === '0.00'">{{
                            !item.disponivel
                              ? '—'
                              : item.acrescimo === '0.00'
                                ? 'Incluso'
                                : '+ ' + moeda(item.acrescimo)
                          }}</span>
                        </div>
                      }
                    </div>
                  }

                  @for (
                    escolha of escolhasDoGrupo(grupo.id);
                    track escolha.chave;
                    let indice = $index
                  ) {
                    <fieldset class="campos cartao-escolha">
                      <legend class="sr-only">Escolha {{ indice + 1 }} de {{ grupo.nome }}</legend>
                      <div class="opts grade-opcoes-tateis" aria-hidden="true">
                        @for (item of grupo.opcoes; track item.id) {
                          <div
                            class="opt cartao-opcao-tatil"
                            [class.sel]="item.id === escolha.opcaoId"
                            [class.off]="!item.disponivel"
                            (click)="item.disponivel && alterarOpcao(escolha.chave, item.id)"
                          >
                            <span class="radio"></span>
                            <span>
                              <b>{{ item.nome }}</b>
                              <small>{{
                                item.disponivel
                                  ? 'Selecionável · limite ' + item.limite
                                  : 'Indisponível nesta unidade agora'
                              }}</small>
                            </span>
                            <span class="delta" [class.inc]="item.acrescimo === '0.00'">{{
                              !item.disponivel
                                ? '—'
                                : item.acrescimo === '0.00'
                                  ? 'Incluso'
                                  : '+ ' + moeda(item.acrescimo)
                            }}</span>
                          </div>
                        }
                      </div>

                      <div
                        class="controles-nativos-escolha"
                        [class.sr-only]="grupo.maximo === 1"
                      >
                        <div>
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
                        </div>

                        <div class="linha-contador">
                          <label [for]="escolha.chave + '-quantidade'"
                            >Quantidade desta escolha</label
                          >
                          <div class="controle-quantidade stepper">
                            <button
                              class="btn-passo"
                              type="button"
                              tabindex="-1"
                              aria-hidden="true"
                              [disabled]="escolha.quantidade <= 1"
                              (click)="
                                alterarEscolha(escolha.chave, {
                                  quantidade: escolha.quantidade > 1 ? escolha.quantidade - 1 : 1,
                                })
                              "
                            >
                              −
                            </button>
                            <input
                              #quantidadeEscolha
                              [id]="escolha.chave + '-quantidade'"
                              type="number"
                              min="1"
                              max="20"
                              step="1"
                              required
                              [value]="escolha.quantidade"
                              (input)="
                                alterarEscolha(escolha.chave, {
                                  quantidade: +quantidadeEscolha.value,
                                })
                              "
                            />
                            <button
                              class="btn-passo"
                              type="button"
                              tabindex="-1"
                              aria-hidden="true"
                              [disabled]="escolha.quantidade >= 20"
                              (click)="
                                alterarEscolha(escolha.chave, {
                                  quantidade: escolha.quantidade < 20 ? escolha.quantidade + 1 : 20,
                                })
                              "
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      @if (escolha.opcaoId && !opcaoDisponivel(escolha)) {
                        <p class="aviso">
                          A escolha anterior não está disponível. Selecione uma alternativa ou
                          remova esta escolha.
                        </p>
                      }

                      @if (opcaoDaEscolha(escolha); as selecionada) {
                        <fieldset class="bloco-adicionais extras">
                          <legend class="extras-t">Adicionais de {{ grupo.nome }}</legend>
                          @for (
                            adicional of adicionaisPermitidos(selecionada);
                            track adicional.id
                          ) {
                            <div class="linha-adicional extra">
                              <label [for]="escolha.chave + '-' + adicional.id">
                                <b>{{ adicional.nome }}</b>
                                <small
                                  >+ {{ moeda(adicional.preco) }} cada · até
                                  {{ adicional.maximo }}</small
                                >
                                <span class="sr-only">
                                  {{ adicional.nome }} · {{ moeda(adicional.preco) }} cada (máximo
                                  {{ adicional.maximo }})
                                </span>
                              </label>
                              <div class="controle-quantidade stepper">
                                <button
                                  class="btn-passo"
                                  type="button"
                                  tabindex="-1"
                                  aria-hidden="true"
                                  [disabled]="
                                    quantidadeAdicionalSelecionada(
                                      escolha.adicionais,
                                      adicional.id
                                    ) <= 0
                                  "
                                  (click)="
                                    alterarEscolha(escolha.chave, {
                                      adicionais: selecionarAdicional(
                                        escolha.adicionais,
                                        adicional.id,
                                        quantidadeAdicionalSelecionada(
                                          escolha.adicionais,
                                          adicional.id
                                        ) - 1
                                      ),
                                    })
                                  "
                                >
                                  −
                                </button>
                                <input
                                  #extra
                                  [id]="escolha.chave + '-' + adicional.id"
                                  type="number"
                                  min="0"
                                  [max]="adicional.maximo"
                                  step="1"
                                  required
                                  [value]="
                                    quantidadeAdicionalSelecionada(escolha.adicionais, adicional.id)
                                  "
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
                                <button
                                  class="btn-passo"
                                  type="button"
                                  tabindex="-1"
                                  aria-hidden="true"
                                  [disabled]="
                                    quantidadeAdicionalSelecionada(
                                      escolha.adicionais,
                                      adicional.id
                                    ) >= adicional.maximo
                                  "
                                  (click)="
                                    alterarEscolha(escolha.chave, {
                                      adicionais: selecionarAdicional(
                                        escolha.adicionais,
                                        adicional.id,
                                        quantidadeAdicionalSelecionada(
                                          escolha.adicionais,
                                          adicional.id
                                        ) + 1
                                      ),
                                    })
                                  "
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          } @empty {
                            <p class="extras-vazio">Sem adicionais permitidos nesta opção.</p>
                          }
                        </fieldset>
                      }
                      <button
                        class="secundario btn-link-remover"
                        [class.sr-only]="grupo.maximo === 1"
                        type="button"
                        (click)="removerEscolha(escolha.chave)"
                      >
                        Remover escolha {{ indice + 1 }} de {{ grupo.nome }}
                      </button>
                    </fieldset>
                  }

                  <button
                    class="secundario btn-adicionar-escolha"
                    [class.sr-only]="grupo.maximo === 1"
                    type="button"
                    (click)="adicionarEscolha(grupo)"
                    [disabled]="totalGrupo(grupo.id) >= grupo.maximo"
                  >
                    Adicionar escolha de {{ grupo.nome }}
                  </button>
                </fieldset>
              }
            }

            @if (exigePontoCarne()) {
              <fieldset class="bloco-ponto-carne">
                <legend>Ponto da carne</legend>
                <p class="ponto-sub">Escolha o ponto desejado para o preparo na chapa ou brasa.</p>
                <div class="ponto-opcoes" role="group" aria-label="Ponto da carne">
                  @for (ponto of pontosCarne; track ponto) {
                    <button
                      type="button"
                      class="ponto-chip"
                      [class.ativo]="pontoCarne() === ponto"
                      [attr.aria-pressed]="pontoCarne() === ponto"
                      (click)="definirPontoCarne(ponto)"
                    >
                      {{ ponto }}
                    </button>
                  }
                </div>
              </fieldset>
            }

            @if (aceitaObservacaoItem()) {
              <div class="bloco-obs-item">
                <label [for]="produto.id + '-obs-item'">
                  Observação deste item <small>(opcional)</small>
                </label>
                <textarea
                  #obsItemInput
                  [id]="produto.id + '-obs-item'"
                  rows="2"
                  maxlength="160"
                  placeholder="Ex.: tirar cebola, molho à parte, sem picles…"
                  [value]="observacaoItem()"
                  (input)="definirObservacaoItem(obsItemInput.value)"
                ></textarea>
                <small class="obs-conta">{{ observacaoItem().length }}/160</small>
              </div>
            }

            @if (previa.erro()) {
              <p role="alert" class="erro">{{ previa.erro() }}</p>
            }
          </fieldset>

          <div class="dlg-foot">
            <div class="linha-contador-rodape">
              <label class="sr-only" for="configurador-quantidade">Quantidade do produto</label>
              <div class="controle-quantidade stepper">
                <button
                  class="btn-passo"
                  type="button"
                  tabindex="-1"
                  aria-hidden="true"
                  [disabled]="quantidadeProduto <= 1"
                  (click)="
                    quantidadeProduto = quantidadeProduto > 1 ? quantidadeProduto - 1 : 1;
                    previa.invalidar()
                  "
                >
                  −
                </button>
                <input
                  #quantidade
                  id="configurador-quantidade"
                  type="number"
                  min="1"
                  max="99"
                  step="1"
                  required
                  [value]="quantidadeProduto"
                  (input)="quantidadeProduto = +quantidade.value; previa.invalidar()"
                />
                <button
                  class="btn-passo"
                  type="button"
                  tabindex="-1"
                  aria-hidden="true"
                  [disabled]="quantidadeProduto >= 99"
                  (click)="
                    quantidadeProduto = quantidadeProduto < 99 ? quantidadeProduto + 1 : 99;
                    previa.invalidar()
                  "
                >
                  +
                </button>
              </div>
            </div>

            <button
              class="cta btn-confirmar-configurador"
              type="submit"
              [disabled]="previa.ocupado() || !permitirAdicionar || !produto.disponivel"
            >
              <span>{{ linha ? 'Atualizar composição no carrinho' : 'Adicionar ao carrinho' }}</span>
              <span class="amount" aria-hidden="true">{{
                moeda(totalEstimadoConfiguracao())
              }}</span>
            </button>
          </div>
        </form>
      </div>
    </section>
  `,
  styleUrl: './catalogo.css',
})
export class ConfiguradorProdutoComponent implements OnChanges {
  @Input({ required: true }) produto!: ProdutoPublico;
  @Input() linha: LinhaCarrinho | null = null;
  @Input() contexto: ContextoCarrinho | null = null;
  @Input() permitirAdicionar = false;
  @Input() categoriaNome = '';
  @Input() pontoInicial = '';
  @Input() observacaoInicial = '';
  @Output() salvar = new EventEmitter<LinhaCarrinho>();
  @Output() salvarComDetalhes = new EventEmitter<{
    linha: LinhaCarrinho;
    detalhes: DetalhesItemConfigurado;
  }>();
  @Output() cancelar = new EventEmitter<void>();
  readonly moeda = moeda;
  readonly pontosCarne = PONTOS_CARNE;
  readonly erro = signal('');
  readonly pontoCarne = signal('');
  readonly observacaoItem = signal('');
  readonly previa = inject(PreviaConfiguracaoService);
  quantidadeProduto = 1;
  adicionais: SelecaoAdicional[] = [];
  escolhas: EscolhaRascunho[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.previa.invalidar();
    if (
      !changes['produto'] &&
      !changes['linha'] &&
      !changes['pontoInicial'] &&
      !changes['observacaoInicial']
    )
      return;
    this.quantidadeProduto = this.linha?.quantidade ?? 1;
    this.adicionais = structuredClone(this.linha?.adicionais ?? []);
    if (this.linha?.escolhas?.length) {
      this.escolhas = this.linha.escolhas.map((item) => ({
        ...structuredClone(item),
        chave: crypto.randomUUID(),
      }));
    } else if (this.produto?.tipo === 'COMBO' && this.produto.grupos.length >= 2) {
      this.escolhas = this.produto.grupos.flatMap((grupo) => {
        const primeira = grupo.opcoes.find((opc) => opc.disponivel);
        return primeira
          ? [
              {
                chave: crypto.randomUUID(),
                grupoId: grupo.id,
                opcaoId: primeira.id,
                quantidade: 1,
                adicionais: [],
              },
            ]
          : [];
      });
    } else {
      this.escolhas = [];
    }
    const precisaPonto = this.produto ? produtoExigePontoCarne(this.produto) : false;
    this.pontoCarne.set(this.pontoInicial?.trim() || (precisaPonto ? 'Ao ponto' : ''));
    this.observacaoItem.set(this.observacaoInicial?.trim() || '');
    this.erro.set('');
  }

  exigePontoCarne(): boolean {
    if (!this.produto || !produtoExigePontoCarne(this.produto)) return false;
    if (this.produto.tipo === 'COMBO' && this.escolhas.length) {
      const escolhidaNaoCarne = this.escolhas.some((e) => {
        const nome = this.opcaoDaEscolha(e)?.nome ?? '';
        return /\b(frango|chicken|veggie|vegano|peixe)\b/i.test(nome);
      });
      const escolhidaCarne = this.escolhas.some((e) => {
        const nome = this.opcaoDaEscolha(e)?.nome ?? '';
        return /\b(burger|smash|costela|bovino|carne|picanha|blend)\b/i.test(nome);
      });
      if (escolhidaNaoCarne && !escolhidaCarne) return false;
    }
    return true;
  }

  aceitaObservacaoItem(): boolean {
    return !!this.produto && !produtoIndustrializadoBebida(this.produto, this.categoriaNome);
  }

  definirPontoCarne(ponto: string): void {
    this.pontoCarne.set(ponto);
  }

  definirObservacaoItem(valor: string): void {
    this.observacaoItem.set(valor.replace(/[\r\n\t]+/g, ' ').slice(0, 160));
  }

  totalEstimadoConfiguracao(): string {
    if (this.previa.linha()) return this.previa.linha()!.subtotal;
    let unitario = Number(this.produto?.preco) || 0;
    for (const sel of this.adicionais) {
      const add = this.produto?.adicionais.find((a) => a.id === sel.adicionalId);
      if (add) unitario += (Number(add.preco) || 0) * sel.quantidade;
    }
    for (const esc of this.escolhas) {
      const opc = this.opcaoDaEscolha(esc);
      if (opc) {
        unitario += (Number(opc.acrescimo) || 0) * esc.quantidade;
        for (const extra of esc.adicionais) {
          const add = opc.adicionais.find((a) => a.id === extra.adicionalId);
          if (add) unitario += (Number(add.preco) || 0) * extra.quantidade;
        }
      }
    }
    return (unitario * (this.quantidadeProduto || 1)).toFixed(2);
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
    if (!linha) return;
    const permitePonto = this.exigePontoCarne();
    const aceitaObs = this.aceitaObservacaoItem();
    const ponto = permitePonto ? this.pontoCarne().trim() || 'Ao ponto' : '';
    const obs = aceitaObs ? this.observacaoItem().trim() : '';
    this.salvar.emit(linha);
    this.salvarComDetalhes.emit({
      linha,
      detalhes: {
        ...(ponto ? { pontoCarne: ponto } : {}),
        ...(obs ? { observacaoItem: obs } : {}),
        resumoCustomizacao: this.montarResumoCustomizacao(ponto, obs),
        aceitaObservacao: aceitaObs,
        permitePontoCarne: permitePonto,
      },
    });
  }

  private montarResumoCustomizacao(ponto: string, obs: string): string {
    const partes: string[] = [];
    for (const sel of this.adicionais) {
      const add = this.produto?.adicionais.find((a) => a.id === sel.adicionalId);
      if (add && sel.quantidade > 0) partes.push(`${sel.quantidade}x ${add.nome}`);
    }
    for (const esc of this.escolhas) {
      const opc = this.opcaoDaEscolha(esc);
      if (opc) {
        const base = esc.quantidade > 1 ? `${esc.quantidade}x ${opc.nome}` : opc.nome;
        const extrasOpc = esc.adicionais
          .map((e) => {
            const add = opc.adicionais.find((a) => a.id === e.adicionalId);
            return add && e.quantidade > 0 ? `+ ${e.quantidade}x ${add.nome}` : '';
          })
          .filter(Boolean);
        partes.push(extrasOpc.length ? `${base} (${extrasOpc.join(', ')})` : base);
      }
    }
    if (ponto) partes.push(`Ponto: ${ponto}`);
    if (obs) partes.push(`Obs: ${obs}`);
    return partes.join(' · ');
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
