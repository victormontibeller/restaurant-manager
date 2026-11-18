import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { mensagemErro } from '../catalogo/modelos';
import { SessaoService } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';
interface Pendencia {
  id: string;
  pedidoId: string;
  tipo: string;
  estado: string;
}
interface Notificacao {
  id: string;
  pedidoId: string;
  tipo: string;
  estado: string;
  tentativas: number;
}
@Component({
  selector: 'app-pendencias-pagamento',
  imports: [RouterLink, HlmButton],
  styleUrl: '../operacao.css',
  templateUrl: './pendencias.component.html',
})
export class PendenciasPagamentoComponent {
  readonly unidadeId = input.required<string>();
  private readonly sessao = inject(SessaoService);
  readonly lista = signal<Pendencia[]>([]);
  readonly notificacoes = signal<Notificacao[]>([]);
  readonly filtroNotificacao = signal<'TODAS' | 'FALHAS'>('TODAS');
  readonly pagina = signal(0);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  private geracao = 0;
  constructor() {
    effect(() => {
      this.unidadeId();
      this.geracao++;
      this.ocupado.set(false);
      this.lista.set([]);
      this.notificacoes.set([]);
      this.filtroNotificacao.set('TODAS');
      untracked(() => void this.carregar(0));
    });
    inject(DestroyRef).onDestroy(() => this.geracao++);
  }
  notificacoesVisiveis(): Notificacao[] {
    const todas = this.notificacoes();
    if (this.filtroNotificacao() === 'TODAS') return todas;
    return todas.filter((n) => n.estado !== 'CAPTURADO' && n.estado !== 'ENVIADO');
  }
  rotuloTipoNotificacao(tipo: string): string {
    const mapa: Record<string, string> = {
      CONFIRMACAO_PEDIDO: 'Confirmação do pedido',
      PEDIDO_ACEITO: 'Pedido aceito',
      PEDIDO_RECUSADO: 'Pedido recusado',
      PEDIDO_PRONTO: 'Pedido pronto',
      PEDIDO_CANCELADO: 'Pedido cancelado',
      DEVOLUCAO_CONFIRMADA: 'Devolução confirmada',
    };
    return mapa[tipo] ?? tipo;
  }
  varianteEstado(estado: string): 'ok' | 'warn' | 'danger' {
    if (estado === 'CAPTURADO' || estado === 'ENVIADO' || estado === 'CONFIRMADO') return 'ok';
    if (estado.includes('FALHA') || estado.includes('ERRO') || estado.includes('RECUSAD'))
      return 'danger';
    return 'warn';
  }
  rotuloEstado(estado: string): string {
    const mapa: Record<string, string> = {
      INCERTO_NO_PROVEDOR: 'Incerto no provedor',
      AGUARDANDO_CONFIRMACAO: 'Aguardando confirmação',
      PENDENTE: 'Pendente',
      SOLICITADA: 'Solicitada',
      CAPTURADO: 'Capturado',
      ENVIADO: 'Enviado',
      FALHA_TEMPORARIA: 'Falha temporária',
      FALHA_PERMANENTE: 'Falha permanente',
      CONFIRMADO: 'Confirmado',
      RECUSADO: 'Recusado',
    };
    if (mapa[estado]) return mapa[estado];
    if (!estado) return 'Pendente';
    const limpo = estado.replaceAll('_', ' ').toLowerCase();
    return limpo.charAt(0).toUpperCase() + limpo.slice(1);
  }
  async carregar(pagina: number): Promise<void> {
    if (pagina < 0 || this.ocupado()) return;
    const g = this.geracao;
    this.ocupado.set(true);
    try {
      const query = '?unidadeId=' + this.unidadeId() + '&pagina=' + pagina;
      const [p, n] = await Promise.all([
        this.sessao.api<Pendencia[]>('/api/v1/operacao/pagamentos' + query),
        this.sessao.api<Notificacao[]>('/api/v1/operacao/notificacoes' + query),
      ]);
      if (g === this.geracao) {
        this.lista.set(p);
        this.notificacoes.set(n);
        this.pagina.set(pagina);
      }
    } catch (e) {
      if (g === this.geracao) this.erro.set(mensagemErro(e));
    } finally {
      if (g === this.geracao) this.ocupado.set(false);
    }
  }
  async reconciliar(p: Pendencia): Promise<void> {
    if (this.ocupado()) return;
    const g = this.geracao;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      await this.sessao.api(
        '/api/v1/operacao/pagamentos/' +
          (p.tipo === 'CHECKOUT' ? 'checkout' : 'devolucao') +
          '/' +
          p.id +
          '/reconciliar',
        'POST',
      );
      if (g === this.geracao)
        this.aviso.set(
          'Reconciliação solicitada para a mesma operação, preservando sua identificação e reservas.',
        );
    } catch (e) {
      if (g === this.geracao) this.erro.set(mensagemErro(e));
    } finally {
      if (g === this.geracao) this.ocupado.set(false);
    }
    if (g === this.geracao) await this.carregar(this.pagina());
  }
}
