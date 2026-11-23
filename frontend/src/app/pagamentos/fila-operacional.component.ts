import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro, moeda, nomeCanal, Pagina } from '../catalogo/modelos';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { nomeEstado } from '../pedidos/modelos';
import {
  ESTADOS_NOTIFICACAO,
  ESTADOS_PAGAMENTO,
  TIPOS_NOTIFICACAO,
  TIPOS_PAGAMENTO,
  dataHora,
  rotulo,
} from '../relatorios/apresentacao-financeira';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';

interface ItemFila {
  id: string;
  pedidoId: string;
  tipo: string;
  estado: string;
  tentativas: number;
  proximaTentativaEm: string | null;
  emProcessamento: boolean;
  ultimaTentativaFalhou: boolean;
  canalPedido: string;
  estadoPedido: string;
  fuso: string;
}
interface Pagamento extends ItemFila {
  criadoEm: string;
  valor: string;
  substituida: boolean | null;
  solicitadoAoProvedor: boolean | null;
  recebimentoId: string | null;
}
interface Notificacao extends ItemFila {
  criadaEm: string;
}

@Component({
  selector: 'app-fila-operacional',
  imports: [FormsModule],
  templateUrl: './fila-operacional.component.html',
  styleUrls: ['../operacao.css', '../relatorios/painel-financeiro.css'],
})
export class FilaOperacionalComponent {
  readonly fila = input.required<'pagamentos' | 'notificacoes'>();
  readonly unidadeId = input.required<string>();
  private readonly sessao = inject(SessaoService);
  private readonly navegacao = inject(NavegacaoProtegidaService);
  private readonly chave = 'reconciliacao-' + crypto.randomUUID();
  readonly tipos = computed(() =>
    Object.entries(this.fila() === 'pagamentos' ? TIPOS_PAGAMENTO : TIPOS_NOTIFICACAO),
  );
  readonly estados = computed(() =>
    Object.entries(this.fila() === 'pagamentos' ? ESTADOS_PAGAMENTO : ESTADOS_NOTIFICACAO),
  );
  readonly lista = signal<(Pagamento | Notificacao)[]>([]);
  readonly pagina = signal(0);
  readonly temMais = signal(false);
  readonly ocupado = signal(false);
  readonly reconciliando = signal('');
  readonly aviso = signal('');
  readonly erro = signal('');
  readonly rotulo = rotulo;
  readonly dataHora = dataHora;
  readonly nomeEstado = nomeEstado;
  readonly nomeCanal = nomeCanal;
  readonly moeda = moeda;
  tipo = '';
  estado = '';
  private contexto = '';
  private geracao = 0;

  constructor() {
    effect(() => {
      const contexto = this.unidadeId() + ':' + this.sessao.identidade()?.usuarioId;
      untracked(() => {
        if (contexto !== this.contexto) {
          this.contexto = contexto;
          this.geracao++;
          this.tipo = '';
          this.estado = '';
          this.lista.set([]);
          this.pagina.set(0);
          this.temMais.set(false);
          this.reconciliando.set('');
          this.aviso.set('');
          this.erro.set('');
          this.ocupado.set(false);
        }
        if (!this.reconciliando()) void this.carregar(this.pagina());
      });
    });
    inject(DestroyRef).onDestroy(() => {
      this.geracao++;
      this.navegacao.liberar(this.chave);
    });
  }

  async carregar(pagina: number): Promise<void> {
    if (pagina < 0 || this.reconciliando()) return;
    const geracao = ++this.geracao;
    this.ocupado.set(true);
    this.erro.set('');
    this.lista.set([]);
    this.temMais.set(false);
    const params = new URLSearchParams({ unidadeId: this.unidadeId(), pagina: String(pagina) });
    if (this.tipo) params.set('tipo', this.tipo);
    if (this.estado) params.set('estado', this.estado);
    try {
      const resposta = await this.sessao.api<Pagina<Pagamento | Notificacao>>(
        '/api/v1/operacao/' + this.fila() + '/pagina?' + params,
      );
      if (geracao === this.geracao) {
        this.lista.set(resposta.itens);
        this.temMais.set(resposta.temMais);
        this.pagina.set(pagina);
      }
    } catch (error) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(error));
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }

  async reconciliar(item: Pagamento): Promise<void> {
    if (
      this.fila() !== 'pagamentos' ||
      this.ocupado() ||
      this.reconciliando() ||
      item.emProcessamento
    )
      return;
    const geracao = this.geracao;
    this.navegacao.bloquear(this.chave, true);
    this.reconciliando.set(item.id);
    this.aviso.set('');
    this.erro.set('');
    try {
      await this.sessao.api(
        '/api/v1/operacao/pagamentos/' +
          (item.tipo === 'CHECKOUT' ? 'checkout' : 'devolucao') +
          '/' +
          item.id +
          '/reconciliar',
        'POST',
      );
      if (geracao === this.geracao)
        this.aviso.set('Reconciliação solicitada para o pedido ' + item.pedidoId.slice(0, 8) + '.');
    } catch (error) {
      if (geracao === this.geracao) {
        this.erro.set(mensagemErro(error));
        if (
          !(error instanceof ApiFailure) ||
          [0, 401, 403, 404, 409].includes(error.status) ||
          error.status >= 500
        ) {
          this.lista.set([]);
          this.temMais.set(false);
        }
      }
      return;
    } finally {
      if (geracao === this.geracao) this.reconciliando.set('');
      this.navegacao.liberar(this.chave);
    }
    if (geracao === this.geracao) await this.carregar(this.pagina());
  }
}
