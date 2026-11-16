import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ContextoCarrinho, Escolha, LinhaCarrinho, SelecaoAdicional } from '../carrinho/modelos';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from '../ui/button';
import { Adicional, GrupoPublico, OpcaoPublica, ProdutoPublico, moeda } from './modelos';
import { PreviaConfiguracaoService } from './previa-configuracao.service';

interface EscolhaRascunho extends Escolha {
  chave: string;
}

@Component({
  selector: 'app-configurador-produto',
  providers: [PreviaConfiguracaoService],
  imports: [NgTemplateOutlet, HlmButton, IconeComponent],
  templateUrl: './configurador-produto.component.html',
  styleUrls: ['./catalogo.css', './configurador-produto.component.css'],
  host: { '[class.configurador-cliente]': 'apresentacaoCliente' },
})
export class ConfiguradorProdutoComponent implements OnChanges {
  @Input({ required: true }) produto!: ProdutoPublico;
  @Input() linha: LinhaCarrinho | null = null;
  @Input() contexto: ContextoCarrinho | null = null;
  @Input() permitirAdicionar = false;
  @Input() apresentacaoCliente = false;
  @ViewChild('retornoConfigurador') private retornoConfigurador?: ElementRef<HTMLElement>;
  @Output() salvar = new EventEmitter<LinhaCarrinho>();
  @Output() cancelar = new EventEmitter<void>();
  readonly moeda = moeda;
  readonly erro = signal('');
  readonly fotoIndisponivel = signal(false);
  readonly previa = inject(PreviaConfiguracaoService);
  quantidadeProduto = 1;
  adicionais: SelecaoAdicional[] = [];
  escolhas: EscolhaRascunho[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    this.previa.invalidar();
    if (!changes['produto'] && !changes['linha']) return;
    if (changes['produto']) this.fotoIndisponivel.set(false);
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
    this.mostrarRetorno();
  }

  guardar(event: Event): void {
    event.preventDefault();
    const linha = this.montarLinha();
    if (linha) this.salvar.emit(linha);
    else this.mostrarRetorno();
  }

  async calcularPrevia(formulario: HTMLFormElement): Promise<void> {
    if (!formulario.reportValidity() || !this.contexto || this.previa.ocupado()) return;
    const linha = this.montarLinha();
    if (linha) await this.previa.calcular(this.contexto, linha);
    if (this.previa.linha() || this.previa.erro() || this.erro()) this.mostrarRetorno();
  }

  private mostrarRetorno(): void {
    if (!this.apresentacaoCliente) return;
    requestAnimationFrame(() => {
      this.retornoConfigurador?.nativeElement.scrollIntoView({ block: 'nearest' });
    });
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
