import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro, moeda } from '../catalogo/modelos';
import { SessaoService } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';
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
}
type PeriodoRapido = 'HOJE' | 'ONTEM' | '7DIAS' | 'MES' | 'CUSTOM';
@Component({
  selector: 'app-vendas',
  imports: [FormsModule, HlmButton],
  styleUrl: '../operacao.css',
  templateUrl: './vendas.component.html',
})
export class VendasComponent {
  readonly unidadeId = input.required<string>();
  private readonly sessao = inject(SessaoService);
  readonly dados = signal<Relatorio | null>(null);
  readonly erro = signal('');
  readonly ocupado = signal(false);
  readonly periodoRapido = signal<PeriodoRapido>('HOJE');
  readonly moeda = moeda;
  inicio = new Date().toLocaleDateString('en-CA');
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
      this.ocupado.set(false);
      untracked(() => void this.carregar());
    });
    inject(DestroyRef).onDestroy(() => this.geracao++);
  }
  data(valor: string): string {
    return valor.split('-').reverse().join('/');
  }
  marcarPeriodoCustom(): void {
    this.periodoRapido.set('CUSTOM');
  }
  aplicarPeriodoRapido(tipo: Exclude<PeriodoRapido, 'CUSTOM'>): void {
    if (this.ocupado()) return;
    const base = new Date();
    const iso = (d: Date) => d.toLocaleDateString('en-CA');
    if (tipo === 'HOJE') {
      this.inicio = iso(base);
      this.fim = this.inicio;
    } else if (tipo === 'ONTEM') {
      const ontem = new Date(base);
      ontem.setDate(ontem.getDate() - 1);
      this.inicio = iso(ontem);
      this.fim = this.inicio;
    } else if (tipo === '7DIAS') {
      const sete = new Date(base);
      sete.setDate(sete.getDate() - 6);
      this.inicio = iso(sete);
      this.fim = iso(base);
    } else if (tipo === 'MES') {
      const primeiro = new Date(base.getFullYear(), base.getMonth(), 1);
      this.inicio = iso(primeiro);
      this.fim = iso(base);
    }
    this.periodoRapido.set(tipo);
    void this.carregar();
  }
  ticketMedio(r: Relatorio): string {
    const total = Number(r.cobrancasOriginais) || 0;
    if (!r.pedidosCriados || total <= 0) return moeda('0.00');
    return moeda((total / r.pedidosCriados).toFixed(2));
  }
  horarioConsulta(r: Relatorio): string {
    if (!r.consultadoEm) return '';
    try {
      const dt = new Date(r.consultadoEm);
      if (Number.isNaN(dt.getTime())) return r.consultadoEm;
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: r.fuso || 'UTC',
      }).format(dt);
    } catch {
      return r.consultadoEm;
    }
  }
  imprimir(): void {
    if (typeof window !== 'undefined' && typeof window.print === 'function') {
      window.print();
    }
  }
  async carregar(): Promise<void> {
    if (this.ocupado()) return;
    const geracao = this.geracao;
    const inicio = this.inicio;
    const fim = this.fim;
    this.ocupado.set(true);
    this.erro.set('');
    this.dados.set(null);
    try {
      const r = await this.sessao.api<Relatorio>(
        '/api/v1/relatorios/vendas?' +
          new URLSearchParams({ unidadeId: this.unidadeId(), inicio, fim }),
      );
      if (geracao === this.geracao) this.dados.set(r);
    } catch (erro) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(erro));
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }
}
