import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro, moeda, nomeCanal } from '../catalogo/modelos';
import { SessaoService } from '../identidade/sessao.service';
import { rotulo, dataHora } from './apresentacao-financeira';
interface Relatorio {
  inicio: string;
  fim: string;
  fuso: string;
  consultadoEm: string;
  pedidosCriados: number;
  canceladosAtualmente: number;
  cobrancasOriginais: string;
  ajustesNoPeriodo: string;
  recebimentosConfirmados: string;
  devolucoesConfirmadas: string;
  saldoAReceberAtual: string;
  saldoADevolverAtual: string;
  reservasAtuais: string;
  dias: { data: string; recebido: string; devolvido: string; ajustes: string }[];
  canais: { canal: string; pedidos: number; cancelados: number; cobrancaOriginal: string }[];
  movimentos: {
    id: string;
    registradoEm: string;
    tipo: string;
    valor: string;
    metodo: string | null;
    pedidoId: string | null;
    comandaId: string | null;
    mesa: string | null;
    canal: string;
    entregue: string | null;
    troco: string | null;
    recebimentoId: string | null;
  }[];
  maisMovimentos: boolean;
}
@Component({
  selector: 'app-vendas',
  imports: [FormsModule],
  styleUrls: ['../operacao.css', './painel-financeiro.css'],
  templateUrl: './vendas.component.html',
})
export class VendasComponent {
  readonly unidadeId = input.required<string>();
  private readonly sessao = inject(SessaoService);
  readonly dados = signal<Relatorio | null>(null);
  readonly erro = signal('');
  readonly ocupado = signal(false);
  readonly moeda = moeda;
  readonly pagina = signal(0);
  readonly rotulo = rotulo;
  readonly dataHora = dataHora;
  readonly nomeCanal = nomeCanal;
  inicio = '';
  fim = this.inicio;
  private geracao = 0;
  private contexto = '';
  constructor() {
    effect(() => {
      const contexto = this.unidadeId() + ':' + (this.sessao.identidade()?.usuarioId ?? '');
      if (contexto === this.contexto) return;
      this.contexto = contexto;
      this.geracao++;
      this.dados.set(null);
      this.inicio = '';
      this.fim = '';
      this.pagina.set(0);
      this.ocupado.set(false);
      untracked(() => void this.carregar());
    });
    inject(DestroyRef).onDestroy(() => this.geracao++);
  }
  data(valor: string): string {
    return valor.split('-').reverse().join('/');
  }
  ticketMedio(relatorio: Relatorio): string {
    const pedidos = relatorio.pedidosCriados;
    return moeda(pedidos ? (Number(relatorio.cobrancasOriginais) / pedidos).toFixed(2) : '0.00');
  }

  paginar(delta: number): void {
    const atual = this.dados();
    if (atual) void this.carregar(this.pagina() + delta, atual.inicio, atual.fim);
  }
  async carregar(pagina = 0, inicio = this.inicio, fim = this.fim): Promise<void> {
    if (this.ocupado()) return;
    const geracao = this.geracao;
    if (pagina < 0) return;
    const params = new URLSearchParams({ unidadeId: this.unidadeId(), pagina: String(pagina) });
    if (inicio) params.set('inicio', inicio);
    if (fim) params.set('fim', fim);
    this.ocupado.set(true);
    this.erro.set('');
    this.dados.set(null);
    try {
      const r = await this.sessao.api<Relatorio>('/api/v1/relatorios/vendas?' + params);
      if (geracao === this.geracao) {
        this.dados.set(r);
        this.pagina.set(pagina);
        if (!inicio && !fim && !this.inicio && !this.fim) {
          this.inicio = r.inicio;
          this.fim = r.fim;
        }
      }
    } catch (erro) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(erro));
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }
}
