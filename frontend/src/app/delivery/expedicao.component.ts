import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro } from '../catalogo/modelos';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { PedidoDetalheComponent } from '../pedidos/pedido-detalhe.component';
import { PedidoComandoService } from '../pedidos/pedido-comando.service';
import { EnderecoPedido, Pedido } from '../pedidos/modelos';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { HlmButton } from '../ui/button';
interface Expedicao {
  pedido: Pedido;
  endereco: EnderecoPedido | null;
  ocorrencia: {
    motivo: string;
    estado: string;
    devolverTaxa: boolean | null;
    decisao: string | null;
  } | null;
}

type FiltroExpedicao = 'TODOS' | 'RETIRADA' | 'PRONTO_DELIVERY' | 'EM_ENTREGA' | 'OCORRENCIA';

@Component({
  selector: 'app-expedicao',
  imports: [FormsModule, PedidoDetalheComponent, HlmButton],
  templateUrl: './expedicao.component.html',
  styleUrl: '../operacao.css',
})
export class ExpedicaoComponent {
  readonly unidadeId = input.required<string>();
  readonly acoes = input<string[]>([]);
  private readonly sessao = inject(SessaoService);
  readonly comandos = inject(PedidoComandoService);
  private readonly nav = inject(NavegacaoProtegidaService);
  private readonly chave = 'expedicao:' + crypto.randomUUID();
  readonly lista = signal<Expedicao[]>([]);
  readonly filtroRapido = signal<FiltroExpedicao>('TODOS');
  readonly pagina = signal(0);
  readonly mais = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly carregando = signal(false);
  motivos: Record<string, string> = {};
  devolverTaxa: Record<string, boolean> = {};
  private geracao = 0;
  constructor() {
    effect(() => {
      this.unidadeId();
      this.sessao.identidade();
      this.geracao++;
      this.limparDados();
      this.carregando.set(false);
      untracked(() => void this.carregar(0));
    });
    effect(() => this.nav.bloquear(this.chave, this.comandos.ocupado() || this.pendente()));
    const timer = setInterval(() => void this.carregar(this.pagina()), 5000);
    inject(DestroyRef).onDestroy(() => {
      this.geracao++;
      clearInterval(timer);
      this.nav.liberar(this.chave);
    });
  }
  tem(acao: string): boolean {
    return this.acoes().includes(acao);
  }
  pendente(): boolean {
    return this.lista().some((e) => !!this.comandos.pendente(e.pedido.id, false));
  }
  private correspondeFiltro(e: Expedicao, filtro: FiltroExpedicao): boolean {
    if (filtro === 'RETIRADA') return e.pedido.canal === 'RETIRADA' && e.pedido.estado === 'PRONTO';
    if (filtro === 'PRONTO_DELIVERY')
      return e.pedido.canal === 'DELIVERY' && e.pedido.estado === 'PRONTO';
    if (filtro === 'EM_ENTREGA') return e.pedido.estado === 'EM_ENTREGA';
    if (filtro === 'OCORRENCIA') return !!e.ocorrencia && e.ocorrencia.estado === 'PENDENTE';
    return true;
  }
  listaVisivel(): Expedicao[] {
    const f = this.filtroRapido();
    const base = this.lista();
    return f === 'TODOS' ? base : base.filter((e) => this.correspondeFiltro(e, f));
  }
  contarFiltro(filtro: FiltroExpedicao): number {
    const base = this.lista();
    return filtro === 'TODOS'
      ? base.length
      : base.filter((e) => this.correspondeFiltro(e, filtro)).length;
  }
  async copiarContato(valor: string): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(valor);
        this.aviso.set('Contato copiado para a área de transferência.');
      }
    } catch {
      /* Ambientes sem permissão de área de transferência mantêm o texto selecionável. */
    }
  }
  private limparDados(): void {
    this.lista.set([]);
    this.filtroRapido.set('TODOS');
    this.pagina.set(0);
    this.mais.set(false);
    this.aviso.set('');
    this.motivos = {};
    this.devolverTaxa = {};
  }
  async carregar(pagina: number): Promise<void> {
    if (pagina < 0 || this.carregando() || this.comandos.ocupado() || this.pendente()) return;
    const geracao = this.geracao;
    this.carregando.set(true);
    try {
      const r = await this.sessao.api<{ itens: Expedicao[]; mais: boolean }>(
        '/api/v1/expedicao?unidadeId=' + this.unidadeId() + '&pagina=' + pagina,
      );
      if (geracao === this.geracao) {
        this.lista.set(r.itens);
        this.mais.set(r.mais);
        this.pagina.set(pagina);
      }
    } catch (erro) {
      if (geracao === this.geracao) {
        if (erro instanceof ApiFailure && [401, 403, 404].includes(erro.status)) this.limparDados();
        this.erro.set(mensagemErro(erro));
      }
    } finally {
      if (geracao === this.geracao) this.carregando.set(false);
    }
  }
  async agir(e: Expedicao, acao: string): Promise<void> {
    if (this.comandos.ocupado() || this.comandos.pendente(e.pedido.id, false)) return;
    this.erro.set('');
    try {
      await this.comandos.executar(e.pedido.id, false, {
        rota: '/api/v1/operacao/pedidos/' + e.pedido.id + '/' + acao,
        corpo: {
          intencaoId: crypto.randomUUID(),
          versao: e.pedido.versao,
          motivo: '',
          unidades: [],
        },
      });
      await this.carregar(this.pagina());
    } catch (erro) {
      this.erro.set(mensagemErro(erro));
    }
  }
  async ocorrencia(e: Expedicao, decisao?: 'NOVA_TENTATIVA' | 'CANCELAMENTO'): Promise<void> {
    if (this.comandos.ocupado() || this.comandos.pendente(e.pedido.id, false)) return;
    const motivo = this.motivos[e.pedido.id]?.trim();
    if (!motivo) {
      this.erro.set('Informe o motivo da ocorrência ou decisão.');
      return;
    }
    this.erro.set('');
    try {
      await this.comandos.executar(e.pedido.id, false, {
        rota:
          '/api/v1/expedicao/pedidos/' + e.pedido.id + '/' + (decisao ? 'decidir' : 'ocorrencia'),
        corpo: {
          intencaoId: crypto.randomUUID(),
          versao: e.pedido.versao,
          motivo,
          decisao: decisao ?? null,
          devolverTaxa:
            decisao === 'CANCELAMENTO' ? (this.devolverTaxa[e.pedido.id] ?? true) : null,
        },
      });
      await this.carregar(this.pagina());
    } catch (erro) {
      this.erro.set(mensagemErro(erro));
    }
  }
}
