import { PagamentoPedidoComponent } from '../pagamentos/pagamento-pedido.component';
import { FinanceiroComponent } from '../financeiro/financeiro.component';
import { Component, DestroyRef, effect, inject, input, output, signal } from '@angular/core';
import { mensagemErro, moeda } from '../catalogo/modelos';
import { HlmButton } from '../ui/button';
import { Pedido, UnidadeProducao, horario, nomeEstado } from './modelos';
import { PedidoComandoService } from './pedido-comando.service';

@Component({
  imports: [FinanceiroComponent, PagamentoPedidoComponent, HlmButton],
  selector: 'app-pedido-detalhe',
  templateUrl: './pedido-detalhe.component.html',
  styleUrls: ['../operacao.css', './pedido-detalhe.component.css'],
})
export class PedidoDetalheComponent {
  readonly pedido = input.required<Pedido>();
  readonly contexto = input<'cliente' | 'mesa' | 'operacao' | 'cozinha'>('cliente');
  readonly acoes = input<string[]>([]);
  readonly atualizar = output<void>();
  readonly comandos = inject(PedidoComandoService);
  readonly selecionadas = signal<string[]>([]);
  readonly financeiroAberto = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly agora = signal(Date.now());
  readonly online = signal(navigator.onLine);
  readonly nomeEstado = nomeEstado;
  readonly horario = horario;
  readonly moeda = moeda;
  motivo = '';
  private versaoSelecao = '';

  constructor() {
    effect(() => {
      const pedido = this.pedido();
      const versao = pedido.id + ':' + pedido.versao;
      if (versao !== this.versaoSelecao) {
        this.versaoSelecao = versao;
        this.selecionadas.set([]);
      }
    });
    const rede = () => this.online.set(navigator.onLine);
    window.addEventListener('online', rede);
    window.addEventListener('offline', rede);
    const timer = setInterval(() => this.agora.set(Date.now()), 1000);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      window.removeEventListener('online', rede);
      window.removeEventListener('offline', rede);
    });
  }

  tem(acao: string): boolean {
    return this.acoes().includes(acao);
  }
  pessoal(): boolean {
    return this.contexto() === 'cliente' || this.contexto() === 'mesa';
  }
  terminal(): boolean {
    return ['CANCELADO', 'CONCLUIDO', 'EM_ENTREGA'].includes(this.pedido().estado);
  }
  referencia(): string {
    return this.pedido().id.slice(0, 8).toUpperCase();
  }
  canal(): string {
    return { MESA: 'Mesa', RETIRADA: 'Retirada', DELIVERY: 'Delivery' }[this.pedido().canal];
  }
  horaCriacao(): string {
    return new Date(this.pedido().criadoEm).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  tempoDecorrido(): string {
    const minutos = Math.max(
      0,
      Math.floor((this.agora() - Date.parse(this.pedido().criadoEm)) / 60000),
    );
    if (minutos < 1) return 'Agora';
    return minutos < 60
      ? minutos + ' min'
      : Math.floor(minutos / 60) + ' h ' + (minutos % 60) + ' min';
  }
  quantidadeEstado(estado: string): number {
    return this.pedido().unidades.filter((unidade) => unidade.estado === estado).length;
  }
  valorPositivo(valor?: string): boolean {
    return !!valor && Number(valor) > 0;
  }
  cancelado(): boolean {
    return this.pedido().estado === 'CANCELADO';
  }
  aguardandoPagamento(): boolean {
    return this.pedido().estado === 'AGUARDANDO_PAGAMENTO';
  }
  etapasTimeline(): { numero: string; titulo: string; estado: 'done' | 'current' | 'pending' }[] {
    const e = this.pedido().estado;
    const delivery = this.pedido().canal === 'DELIVERY';
    if (e === 'AGUARDANDO_PAGAMENTO') {
      return [
        { numero: '01', titulo: 'Aguardando pagamento', estado: 'current' },
        { numero: '02', titulo: 'Recebido', estado: 'pending' },
        { numero: '03', titulo: 'Em preparo', estado: 'pending' },
        { numero: '04', titulo: delivery ? 'Pronto / Entrega' : 'Pronto', estado: 'pending' },
      ];
    }
    const idx =
      e === 'AGUARDANDO_ACEITE'
        ? 0
        : e === 'NA_FILA' || e === 'EM_PREPARO'
          ? 1
          : e === 'PRONTO' || e === 'EM_ENTREGA'
            ? 2
            : 3;
    const labels = [
      e === 'AGUARDANDO_ACEITE' ? 'Aguardando confirmação' : 'Confirmado',
      e === 'NA_FILA' ? 'Na fila da cozinha' : 'Em preparo',
      e === 'EM_ENTREGA' ? 'Saiu para entrega' : delivery ? 'Pronto / Entrega' : 'Pronto',
      'Concluído',
    ];
    return labels.map((titulo, i) => ({
      numero: '0' + (i + 1),
      titulo,
      estado: e === 'CONCLUIDO' || i < idx ? 'done' : i === idx ? 'current' : 'pending',
    }));
  }
  resumoUnidadesCliente(): string {
    const ativas = this.pedido().unidades.filter((u) => u.estado !== 'CANCELADO');
    if (ativas.length <= 1 || this.terminal()) return '';
    const prontas = ativas.filter((u) => u.estado === 'PRONTO').length;
    const emPreparo = ativas.filter((u) => u.estado === 'EM_PREPARO').length;
    if (prontas > 0 && prontas < ativas.length) {
      return prontas + ' de ' + ativas.length + ' itens já prontos.';
    }
    if (emPreparo > 0 && emPreparo < ativas.length) {
      return emPreparo + ' de ' + ativas.length + ' itens em preparo na cozinha.';
    }
    return '';
  }
  nomeEvento(tipo: string): string {
    return (
      (
        {
          PEDIDO_CRIADO: 'Pedido registrado',
          CRIADO: 'Pedido registrado',
          ACEITO: 'Confirmado pelo restaurante',
          EM_PREPARO: 'Preparo iniciado',
          PRONTO: 'Pedido pronto',
          EM_ENTREGA: 'Saiu para entrega',
          CONCLUIDO: 'Concluído',
          CANCELADO: 'Cancelado',
          RECUSADO: 'Recusado pelo restaurante',
          SOLICITACAO_CANCELAMENTO: 'Solicitação de cancelamento',
        } as Record<string, string>
      )[tipo] ?? tipo
    );
  }
  podeCancelarOperacional(): boolean {
    return (
      this.contexto() === 'operacao' &&
      !this.terminal() &&
      this.tem(
        this.pedido().primeiroPreparoEm
          ? 'pedido.cancelar_apos_preparo'
          : 'pedido.cancelar_antes_preparo',
      )
    );
  }
  podeSelecionar(unidade: UnidadeProducao): boolean {
    if (this.terminal() || unidade.estado === 'CANCELADO') return false;
    if (this.contexto() === 'cozinha') {
      return (
        (unidade.estado === 'NA_FILA' && this.tem('cozinha.iniciar')) ||
        (unidade.estado === 'EM_PREPARO' && this.tem('cozinha.concluir'))
      );
    }
    return this.podeCancelarOperacional();
  }
  pedeMotivo(): boolean {
    const avaliacao =
      this.contexto() === 'operacao' &&
      this.tem('pedido.cancelar_apos_preparo') &&
      this.pedido().solicitacoes?.some((solicitacao) => solicitacao.estado === 'PENDENTE');
    return (
      !!avaliacao ||
      (!this.terminal() &&
        (this.pessoal() ||
          this.podeCancelarOperacional() ||
          (this.contexto() === 'operacao' &&
            this.pedido().estado === 'AGUARDANDO_ACEITE' &&
            this.tem('pedido.recusar'))))
    );
  }
  cancelamentoPendente(): boolean {
    return !!this.pedido().solicitacoes?.some((solicitacao) => solicitacao.estado === 'PENDENTE');
  }
  pendente() {
    return this.comandos.pendente(this.pedido().id, this.contexto() === 'mesa');
  }
  bloqueado(): boolean {
    return this.comandos.ocupado() || !this.online() || !!this.pendente();
  }

  prazo(): string {
    const pedido = this.pedido();
    if (pedido.estado !== 'AGUARDANDO_ACEITE' || !pedido.expirarEm) return '';
    const segundos = Math.max(0, Math.ceil((Date.parse(pedido.expirarEm) - this.agora()) / 1000));
    return segundos
      ? 'Aceite em até ' + Math.floor(segundos / 60) + ' min ' + (segundos % 60) + ' s.'
      : 'Prazo vencido. Aguarde a atualização do servidor.';
  }

  alertaPrazo(): boolean {
    return (
      this.pedido().estado === 'AGUARDANDO_ACEITE' &&
      !!this.pedido().alertarEm &&
      Date.parse(this.pedido().alertarEm!) <= this.agora()
    );
  }

  selecionar(id: string, marcado: boolean): void {
    this.selecionadas.update((lista) =>
      marcado ? [...new Set([...lista, id])] : lista.filter((atual) => atual !== id),
    );
  }

  async comandar(acao: string, solicitacaoId?: string): Promise<void> {
    if (this.bloqueado()) return;
    if (acao === 'servir' && this.cancelamentoPendente()) {
      this.erro.set(
        'Aguarde a decisão sobre o cancelamento antes de marcar o pedido como servido.',
      );
      return;
    }
    const pedido = this.pedido();
    const precisaMotivo = [
      'cancelar',
      'recusar',
      'solicitar-cancelamento',
      'aprovar',
      'rejeitar',
    ].includes(acao);
    if (precisaMotivo && !this.motivo.trim()) {
      this.erro.set('Informe o motivo da ação.');
      return;
    }
    if (['iniciar', 'concluir'].includes(acao) && !this.selecionadas().length) {
      this.erro.set('Selecione as unidades comerciais que serão atualizadas.');
      return;
    }
    const base =
      this.contexto() === 'mesa'
        ? '/api/v1/mesa/pedidos'
        : this.contexto() === 'cliente'
          ? '/api/v1/me/pedidos'
          : this.contexto() === 'cozinha'
            ? '/api/v1/cozinha/pedidos'
            : '/api/v1/operacao/pedidos';
    const rota =
      base + '/' + pedido.id + (solicitacaoId ? '/solicitacoes/' + solicitacaoId : '') + '/' + acao;
    await this.executar({
      rota,
      corpo: {
        intencaoId: crypto.randomUUID(),
        versao: pedido.versao,
        motivo: this.motivo.trim(),
        unidades: this.pessoal() ? [] : [...this.selecionadas()],
      },
    });
  }

  async repetir(): Promise<void> {
    const intencao = this.pendente();
    if (intencao && !this.comandos.ocupado() && this.online()) await this.executar(intencao);
  }

  private async executar(
    intencao: import('./pedido-comando.service').IntencaoComando,
  ): Promise<void> {
    this.erro.set('');
    this.aviso.set('');
    try {
      await this.comandos.executar(this.pedido().id, this.contexto() === 'mesa', intencao);
      this.motivo = '';
      this.selecionadas.set([]);
      this.aviso.set('Ação confirmada pelo servidor.');
    } catch (error) {
      this.erro.set(mensagemErro(error));
    } finally {
      this.atualizar.emit();
    }
  }
}
