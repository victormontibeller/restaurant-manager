import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IconeComponent } from '../rotas/icone.component';
import { HlmButton } from '../ui/button';
import { andamentoPedido, orientacaoPedido } from './andamento-pedido';
import { PagamentoPedidoComponent } from '../pagamentos/pagamento-pedido.component';
import { FinanceiroComponent } from '../financeiro/financeiro.component';
import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { mensagemErro, moeda, nomeCanal } from '../catalogo/modelos';
import { Pedido, UnidadeProducao, horario, nomeEstado } from './modelos';
import { PedidoComandoService } from './pedido-comando.service';

@Component({
  imports: [
    FinanceiroComponent,
    PagamentoPedidoComponent,
    NgTemplateOutlet,
    RouterLink,
    IconeComponent,
    HlmButton,
  ],
  selector: 'app-pedido-detalhe',
  templateUrl: './pedido-detalhe.component.html',
  styleUrls: ['../operacao.css', './pedido-detalhe.component.css', './pedido-acompanhamento.css'],
})
export class PedidoDetalheComponent {
  readonly pedido = input.required<Pedido>();
  readonly contexto = input<'cliente' | 'mesa' | 'operacao' | 'cozinha'>('cliente');
  readonly linkAcompanhamento = input(false);
  readonly compacto = input(false);
  readonly unidadeDaFila = input('');
  readonly acoes = input<string[]>([]);
  readonly atualizar = output<void>();
  readonly comandos = inject(PedidoComandoService);
  readonly selecionadas = signal<string[]>([]);
  readonly financeiroAberto = signal(false);
  readonly detalhesAbertos = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly agora = signal(Date.now());
  readonly online = signal(navigator.onLine);
  readonly nomeEstado = nomeEstado;
  readonly horario = horario;
  readonly moeda = moeda;
  protected readonly etapas = computed(() => andamentoPedido(this.pedido()));
  protected readonly orientacao = computed(() => orientacaoPedido(this.pedido()));
  private readonly prazoAceite = computed(() => {
    const { estado, expirarEm } = this.pedido();
    if (estado !== 'AGUARDANDO_ACEITE' || !expirarEm) return null;
    const prazo = Date.parse(expirarEm);
    return Number.isFinite(prazo) ? prazo : null;
  });
  private readonly criadoEm = computed(() => Date.parse(this.pedido().criadoEm));
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
    effect((onCleanup) => {
      const mostraTempoDecorrido = !this.pessoal();
      const prazo = this.prazoAceite();
      if (prazo === null && !mostraTempoDecorrido) return;
      const criadoEm = mostraTempoDecorrido ? this.criadoEm() : 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const atualizarRelogio = () => {
        const instante = Date.now();
        this.agora.set(instante);
        if (prazo !== null && instante < prazo) {
          timer = setTimeout(atualizarRelogio, Math.min(1000, prazo - instante));
        } else if (mostraTempoDecorrido && Number.isFinite(criadoEm)) {
          const decorrido = Math.max(0, instante - criadoEm);
          timer = setTimeout(atualizarRelogio, 60000 - (decorrido % 60000));
        }
      };
      atualizarRelogio();
      onCleanup(() => clearTimeout(timer));
    });
    inject(DestroyRef).onDestroy(() => {
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
    return nomeCanal(this.pedido().canal);
  }
  horaCriacao(): string {
    return new Date(this.pedido().criadoEm).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  tempoDecorrido(): string {
    const minutos = Math.max(0, Math.floor((this.agora() - this.criadoEm()) / 60000));
    if (minutos < 1) return 'Agora';
    return minutos < 60
      ? minutos + ' min'
      : Math.floor(minutos / 60) + ' h ' + (minutos % 60) + ' min';
  }
  quantidadeEstado(estado: string): number {
    return this.pedido().unidades.filter((unidade) => unidade.estado === estado).length;
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
    const prazo = this.prazoAceite();
    if (prazo === null) return '';
    const segundos = Math.max(0, Math.ceil((prazo - this.agora()) / 1000));
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

  alternarDetalhes(): void {
    this.detalhesAbertos.update((abertos) => !abertos);
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
    const usaSelecao = !this.pessoal() && (!this.compacto() || acao === 'cancelar');
    await this.executar({
      rota,
      corpo: {
        intencaoId: crypto.randomUUID(),
        versao: pedido.versao,
        motivo: !this.compacto() || precisaMotivo ? this.motivo.trim() : '',
        unidades: usaSelecao ? [...this.selecionadas()] : [],
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
      await this.comandos.executar(
        this.pedido().id,
        this.contexto() === 'mesa',
        intencao,
        this.unidadeDaFila(),
      );
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
