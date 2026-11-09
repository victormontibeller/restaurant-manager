import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { mensagemErro } from '../catalogo/modelos';
import { SessaoService } from '../identidade/sessao.service';

interface Checkout {
  id: string;
  estado: string;
  checkoutUrl: string | null;
  ultimaFalha: string | null;
}

@Component({
  selector: 'app-pagamento-pedido',
  templateUrl: './pagamento-pedido.component.html',
  styleUrl: '../operacao.css',
})
export class PagamentoPedidoComponent {
  readonly pedidoId = input.required<string>();
  readonly aguardando = input(false);
  private readonly sessao = inject(SessaoService);
  readonly tentativas = signal<Checkout[]>([]);
  readonly erro = signal('');
  readonly consultando = signal(false);
  podeTentar(): boolean {
    return this.tentativas().every((c) => c.estado === 'RECUSADO');
  }
  private consulta = 0;
  private intencao: string | null = null;
  constructor() {
    effect(() => {
      this.pedidoId();
      this.tentativas.set([]);
      this.consulta++;
      this.consultando.set(false);
      untracked(() => void this.carregar());
    });
    const timer = setInterval(() => {
      if (this.sessao.identidade()?.perfil === 'CLIENTE') void this.carregar();
    }, 5000);
    inject(DestroyRef).onDestroy(() => {
      this.consulta++;
      clearInterval(timer);
    });
  }
  estado(estado: string): string {
    return (
      (
        {
          SOLICITADO: 'Preparando checkout…',
          AGUARDANDO: 'Aguardando confirmação de pagamento',
          CONFIRMADO: 'Pagamento confirmado',
          RECUSADO: 'Tentativa recusada ou encerrada',
          EM_RECONCILIACAO: 'Conferindo o resultado com o provedor',
          BLOQUEADO: 'Pagamento exige análise da equipe',
        } as Record<string, string>
      )[estado] ?? estado
    );
  }
  private rota(): string {
    return '/api/v1/me/pedidos/' + this.pedidoId() + '/pagamento';
  }
  async carregar(): Promise<void> {
    if (this.consultando()) return;
    const consulta = ++this.consulta;
    const pedido = this.pedidoId();
    this.consultando.set(true);
    try {
      const dados = await this.sessao.api<Checkout[]>(this.rota());
      if (consulta === this.consulta && pedido === this.pedidoId()) this.tentativas.set(dados);
    } catch (erro) {
      if (consulta === this.consulta) this.erro.set(mensagemErro(erro));
    } finally {
      if (consulta === this.consulta) this.consultando.set(false);
    }
  }
  async tentar(): Promise<void> {
    if (this.consultando()) return;
    this.intencao ??= crypto.randomUUID();
    this.consultando.set(true);
    this.erro.set('');
    try {
      this.tentativas.set(
        await this.sessao.api<Checkout[]>(this.rota() + '/tentativas/' + this.intencao, 'POST'),
      );
      this.intencao = null;
    } catch (erro) {
      this.erro.set(mensagemErro(erro));
    } finally {
      this.consultando.set(false);
    }
  }
}
