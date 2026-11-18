import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro, moeda } from '../catalogo/modelos';
import { SessaoService } from '../identidade/sessao.service';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { HlmButton } from '../ui/button';
import { FinanceiroService } from './financeiro.service';
import { DetalheFinanceiro, IntencaoFinanceira } from './modelos';

@Component({
  selector: 'app-financeiro',
  imports: [FormsModule, HlmButton],
  templateUrl: './financeiro.component.html',
  styleUrl: '../operacao.css',
  styles: `:host { display:block; margin-block:1rem; }`,
})
export class FinanceiroComponent {
  readonly recurso = input.required<string>();
  readonly tipo = input<'pedidos' | 'comandas'>('pedidos');
  readonly acoes = input<string[]>([]);
  readonly atualizacao = input<unknown>();
  readonly atualizar = output<void>();
  readonly movimentos = inject(FinanceiroService);
  private readonly sessao = inject(SessaoService);
  private readonly navegacao = inject(NavegacaoProtegidaService);
  private readonly chaveNavegacao = 'financeiro:' + crypto.randomUUID();
  readonly dados = signal<DetalheFinanceiro | null>(null);
  readonly erroConsulta = signal('');
  readonly erroAcao = signal('');
  readonly aviso = signal('');
  readonly carregando = signal(false);
  readonly moeda = moeda;
  metodo = 'PIX';
  valor = '';
  entregue = '';
  parcela = '';
  valorAjuste = '';
  motivoAjuste = '';
  recebimento = '';
  valorDevolucao = '';
  motivoDevolucao = '';
  private consulta = 0;
  private contextoAtual = '';

  constructor() {
    effect(() => {
      const contexto = this.movimentos.chave(this.base());
      this.atualizacao();
      if (contexto !== this.contextoAtual) {
        this.contextoAtual = contexto;
        this.dados.set(null);
        this.erroAcao.set('');
        this.erroConsulta.set('');
        this.aviso.set('');
        this.metodo = 'PIX';
        this.valor = '';
        this.entregue = '';
        this.parcela = '';
        this.valorAjuste = '';
        this.motivoAjuste = '';
        this.recebimento = '';
        this.valorDevolucao = '';
        this.motivoDevolucao = '';
      }
      if (this.movimentos.ocupado() || this.movimentos.pendente(this.base())) return;
      untracked(() => {
        void this.carregar();
      });
    });
    effect(() =>
      this.navegacao.bloquear(
        this.chaveNavegacao,
        this.movimentos.ocupado() || !!this.movimentos.pendente(this.base()),
      ),
    );
    inject(DestroyRef).onDestroy(() => {
      this.consulta++;
      this.navegacao.liberar(this.chaveNavegacao);
    });
  }

  tem(acao: string): boolean {
    return this.acoes().includes(acao);
  }
  base(): string {
    return '/api/v1/financeiro/' + this.tipo() + '/' + this.recurso();
  }
  bloqueado(): boolean {
    return (
      this.movimentos.ocupado() ||
      !!this.movimentos.pendente(this.base()) ||
      !navigator.onLine ||
      this.dados()?.cobrancaId === null
    );
  }

  async carregar(): Promise<void> {
    const consulta = ++this.consulta;
    const chave = this.movimentos.chave(this.base());
    this.carregando.set(true);
    try {
      const dados = await this.sessao.api<DetalheFinanceiro>(this.base());
      if (consulta !== this.consulta || chave !== this.movimentos.chave(this.base())) return;
      this.dados.set(dados);
      this.erroConsulta.set('');
    } catch (erro) {
      if (consulta === this.consulta) this.erroConsulta.set(mensagemErro(erro));
    } finally {
      if (consulta === this.consulta) this.carregando.set(false);
    }
  }

  async receber(): Promise<void> {
    await this.comandar('/recebimentos', {
      metodo: this.metodo,
      valor: this.valor,
      entregue: this.metodo === 'DINHEIRO' ? this.entregue : null,
    });
  }
  async ajustar(): Promise<void> {
    await this.comandar('/ajustes', {
      motivo: this.motivoAjuste,
      alocacoes: [{ parcelaId: this.parcela, valor: this.valorAjuste }],
    });
  }
  async devolver(): Promise<void> {
    await this.comandar('/devolucoes', {
      recebimentoId: this.recebimento,
      valor: this.valorDevolucao,
      motivo: this.motivoDevolucao,
    });
  }
  online(recebimentoId: string): boolean {
    return (
      this.dados()?.recebimentos.some((r) => r.id === recebimentoId && r.metodo === 'ONLINE') ??
      false
    );
  }
  temSaldoAReceber(): boolean {
    return Number(this.dados()?.saldo.saldoAReceber ?? 0) > 0;
  }
  usarSaldoRestante(): void {
    const restante = this.dados()?.saldo.saldoAReceber;
    if (restante && Number(restante) > 0) {
      this.valor = restante;
      if (this.metodo === 'DINHEIRO' && !this.entregue) {
        this.entregue = restante;
      }
    }
  }
  calculoTroco(): { falta: boolean; valor: string } | null {
    if (this.metodo !== 'DINHEIRO') return null;
    const aplicado = Number(this.valor);
    const entregue = Number(this.entregue);
    if (
      !this.valor.trim() ||
      !this.entregue.trim() ||
      Number.isNaN(aplicado) ||
      Number.isNaN(entregue) ||
      aplicado <= 0
    ) {
      return null;
    }
    const diffCentavos = Math.round(entregue * 100) - Math.round(aplicado * 100);
    return {
      falta: diffCentavos < 0,
      valor: moeda((Math.abs(diffCentavos) / 100).toFixed(2)),
    };
  }
  horarioCurto(iso?: string | null): string {
    if (!iso) return '';
    try {
      const dt = new Date(iso);
      if (Number.isNaN(dt.getTime())) return '';
      return dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  async confirmar(id: string): Promise<void> {
    await this.comandar('/devolucoes/' + id + '/confirmar', {});
  }
  async repetir(): Promise<void> {
    const pendente = this.movimentos.pendente(this.base());
    if (pendente && !this.movimentos.ocupado()) await this.executar(pendente);
  }
  private async comandar(sufixo: string, corpo: object): Promise<void> {
    if (this.bloqueado()) return;
    await this.executar({
      rota: this.base() + sufixo,
      corpo: { ...corpo, intencaoId: crypto.randomUUID() },
    });
  }
  private async executar(intencao: IntencaoFinanceira): Promise<void> {
    const base = this.base();
    this.erroAcao.set('');
    this.aviso.set('');
    try {
      const dados = await this.movimentos.executar(base, intencao);
      if (base !== this.base()) return;
      this.dados.set(dados);
      this.aviso.set('Operação financeira confirmada pelo servidor.');
      this.valor = '';
      this.entregue = '';
      this.valorAjuste = '';
      this.valorDevolucao = '';
      this.atualizar.emit();
    } catch (erro) {
      if (base === this.base()) this.erroAcao.set(mensagemErro(erro));
    }
  }
}
