import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro, moeda } from '../catalogo/modelos';
import { SessaoService } from '../identidade/sessao.service';
interface Relatorio {
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
}
@Component({
  selector: 'app-vendas',
  imports: [FormsModule],
  styleUrl: '../operacao.css',
  templateUrl: './vendas.component.html',
})
export class VendasComponent {
  readonly unidadeId = input.required<string>();
  private readonly sessao = inject(SessaoService);
  readonly dados = signal<Relatorio | null>(null);
  readonly erro = signal('');
  readonly ocupado = signal(false);
  readonly moeda = moeda;
  inicio = new Date().toLocaleDateString('en-CA');
  fim = this.inicio;
  private geracao = 0;
  constructor() {
    effect(() => {
      this.unidadeId();
      this.geracao++;
      this.dados.set(null);
      this.ocupado.set(false);
      untracked(() => void this.carregar());
    });
    inject(DestroyRef).onDestroy(() => this.geracao++);
  }
  async carregar(): Promise<void> {
    if (this.ocupado()) return;
    const geracao = this.geracao;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const r = await this.sessao.api<Relatorio>(
        '/api/v1/relatorios/vendas?' +
          new URLSearchParams({ unidadeId: this.unidadeId(), inicio: this.inicio, fim: this.fim }),
      );
      if (geracao === this.geracao) this.dados.set(r);
    } catch (erro) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(erro));
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }
}
