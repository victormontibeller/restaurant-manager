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
import { mensagemErro, moeda } from '../catalogo/modelos';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { AcompanhamentoEventos } from '../eventos/acompanhamento';
import { nomeEstado } from '../pedidos/modelos';
import { AberturaAtendimento, Comanda, Mesa, SolicitacaoMesa } from './modelos';

@Component({
  selector: 'app-mesas',
  templateUrl: './mesas.component.html',
  styleUrls: ['../operacao.css', './mesas.component.css'],
})
export class MesasComponent {
  readonly unidadeId = input.required<string>();
  readonly acoes = input<string[]>([]);
  readonly administrador = input(false);
  private readonly sessao = inject(SessaoService);
  readonly mesas = signal<Mesa[]>([]);
  readonly solicitacoes = signal<SolicitacaoMesa[]>([]);
  readonly paginaMesas = signal(0);
  readonly paginaSolicitacoes = signal(0);
  readonly maisMesas = signal(false);
  readonly maisSolicitacoes = signal(false);
  readonly carregando = signal(false);
  readonly comanda = signal<Comanda | null>(null);
  readonly abertura = signal<AberturaAtendimento | null>(null);
  readonly ocupado = signal(false);
  private readonly erroAcao = signal('');
  private readonly erroConsulta = signal('');
  readonly erro = computed(() =>
    [this.erroAcao(), this.erroConsulta() ? 'Atualização dos dados: ' + this.erroConsulta() : '']
      .filter(Boolean)
      .join(' '),
  );
  readonly aviso = signal('');
  readonly acompanhamento = new AcompanhamentoEventos();
  readonly nomeEstado = nomeEstado;
  readonly moeda = moeda;
  readonly qrMesa = signal<Mesa | null>(null);
  readonly qrUrl = signal('');
  readonly criacaoPendente = signal<{ id: string; unidadeId: string; nome: string } | null>(null);
  private readonly aberturas = new Map<string, string>();
  private readonly criacoes = new Map<string, { id: string; unidadeId: string; nome: string }>();
  private geracao = 0;
  private selecaoComanda = 0;
  private carregamento: Promise<void> | null = null;
  private contextoAtual = '';
  nome = '';

  constructor() {
    effect(() => {
      this.acoes();
      if (!this.financeiro()) this.comanda.set(null);
      if (!this.tem('pedido.criar_assistido')) this.abertura.set(null);
    });
    effect(() => {
      const unidade = this.unidadeId();
      const contexto = this.contexto();
      if (contexto === this.contextoAtual) return;
      this.contextoAtual = contexto;
      this.geracao++;
      this.selecaoComanda++;
      this.carregamento = null;
      this.carregando.set(false);
      this.mesas.set([]);
      this.solicitacoes.set([]);
      this.paginaMesas.set(0);
      this.paginaSolicitacoes.set(0);
      this.maisMesas.set(false);
      this.maisSolicitacoes.set(false);
      this.comanda.set(null);
      this.abertura.set(null);
      this.qrMesa.set(null);
      this.criacaoPendente.set(this.criacoes.get(contexto) ?? null);
      this.nome = '';
      this.erroAcao.set('');
      this.erroConsulta.set('');
      this.aviso.set('');
      this.ocupado.set(false);
      untracked(() =>
        this.acompanhamento.iniciar(
          this.sessao,
          '/api/v1/eventos',
          { unidadeId: unidade },
          () => this.carregar(true),
          () => {
            this.mesas.set([]);
            this.solicitacoes.set([]);
            this.comanda.set(null);
            this.abertura.set(null);
          },
        ),
      );
    });
    inject(DestroyRef).onDestroy(() => {
      this.geracao++;
      this.acompanhamento.encerrar();
    });
  }

  tem(acao: string): boolean {
    return this.acoes().includes(acao);
  }
  private contexto(): string {
    return location.origin + ':' + this.sessao.identidade()?.usuarioId + ':' + this.unidadeId();
  }
  financeiro(): boolean {
    return [
      'comanda.iniciar_fechamento',
      'comanda.concluir',
      'recebimento.registrar',
      'financeiro.ajustar',
    ].some((acao) => this.tem(acao));
  }
  linkMesa(mesa: Mesa): string {
    return location.origin + '/?mesa=' + encodeURIComponent(mesa.id);
  }

  async mostrarQr(mesa: Mesa): Promise<void> {
    const geracao = this.geracao;
    try {
      const { default: qrcode } = await import('qrcode-generator');
      if (geracao !== this.geracao) return;
      const qr = qrcode(0, 'M');
      qr.addData(this.linkMesa(mesa));
      qr.make();
      this.qrUrl.set(qr.createDataURL(6, 24));
      this.qrMesa.set(mesa);
    } catch {
      if (geracao === this.geracao)
        this.erroAcao.set('Não foi possível gerar o QR. Recarregue com conexão e tente novamente.');
    }
  }

  async mudarPaginaMesas(pagina: number): Promise<void> {
    if (pagina < 0 || this.ocupado()) return;
    await this.carregar(false, pagina);
  }

  async mudarPaginaSolicitacoes(pagina: number): Promise<void> {
    if (pagina < 0 || this.ocupado()) return;
    await this.carregar(false, undefined, pagina);
  }

  async carregar(
    automatica = false,
    paginaMesas?: number,
    paginaSolicitacoes?: number,
  ): Promise<void> {
    const geracao = this.geracao;
    while (this.carregamento) {
      await this.carregamento.catch(() => undefined);
      if (geracao !== this.geracao) return;
    }
    const consulta = this.consultar(
      automatica ? this.paginaMesas() : (paginaMesas ?? this.paginaMesas()),
      automatica ? this.paginaSolicitacoes() : (paginaSolicitacoes ?? this.paginaSolicitacoes()),
      automatica,
    );
    this.carregamento = consulta;
    try {
      await consulta;
    } finally {
      if (this.carregamento === consulta) this.carregamento = null;
    }
  }

  private async consultar(
    paginaMesas: number,
    paginaSolicitacoes: number,
    automatica: boolean,
  ): Promise<void> {
    const geracao = this.geracao;
    this.carregando.set(true);
    try {
      const mesas = await this.sessao.api<Mesa[]>(
        '/api/v1/operacao/mesas?unidadeId=' + this.unidadeId() + '&pagina=' + paginaMesas,
      );
      if (geracao !== this.geracao) return;
      const solicitacoes = this.tem('mesa.atender')
        ? await this.sessao.api<SolicitacaoMesa[]>(
            '/api/v1/operacao/mesas/solicitacoes?unidadeId=' +
              this.unidadeId() +
              '&pagina=' +
              paginaSolicitacoes,
          )
        : [];
      if (geracao !== this.geracao) return;
      this.mesas.set(mesas);
      this.solicitacoes.set(solicitacoes);
      this.paginaMesas.set(paginaMesas);
      this.paginaSolicitacoes.set(paginaSolicitacoes);
      this.maisMesas.set(mesas.length === 50);
      this.maisSolicitacoes.set(solicitacoes.length === 50);
      if (this.comanda() && this.financeiro()) {
        const id = this.comanda()!.id;
        const selecao = this.selecaoComanda;
        let comanda: Comanda;
        try {
          comanda = await this.sessao.api<Comanda>('/api/v1/comandas/' + id);
        } catch (error) {
          if (geracao !== this.geracao || selecao !== this.selecaoComanda) return;
          throw error;
        }
        if (
          geracao !== this.geracao ||
          selecao !== this.selecaoComanda ||
          this.comanda()?.id !== id ||
          !this.financeiro()
        )
          return;
        this.comanda.set(comanda);
      } else if (!this.financeiro()) this.comanda.set(null);
      if (geracao === this.geracao) this.erroConsulta.set('');
    } catch (error) {
      if (geracao !== this.geracao) return;
      this.erroConsulta.set(mensagemErro(error));
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status)) {
        this.mesas.set([]);
        this.solicitacoes.set([]);
        this.comanda.set(null);
        this.abertura.set(null);
      }
      if (automatica) throw error;
    } finally {
      if (geracao === this.geracao) this.carregando.set(false);
    }
  }

  async criar(event: Event): Promise<void> {
    event.preventDefault();
    const contexto = this.contexto();
    const repeticao = !!this.criacaoPendente();
    const corpo = this.criacaoPendente() ?? {
      id: crypto.randomUUID(),
      unidadeId: this.unidadeId(),
      nome: this.nome.trim(),
    };
    if (!corpo.nome || this.ocupado()) return;
    this.criacaoPendente.set(corpo);
    this.criacoes.set(contexto, corpo);
    await this.executar(async (vigente) => {
      try {
        await this.sessao.api('/api/v1/operacao/mesas', 'POST', corpo);
      } catch (error) {
        // Só a primeira rejeição definitiva permite corrigir o cadastro. Uma
        // recusa posterior não descarta um commit cuja resposta foi perdida.
        if (
          !repeticao &&
          error instanceof ApiFailure &&
          error.status >= 400 &&
          error.status < 500
        ) {
          this.criacoes.delete(contexto);
          if (vigente()) this.criacaoPendente.set(null);
        }
        throw error;
      }
      this.criacoes.delete(contexto);
      if (!vigente()) return;
      this.criacaoPendente.set(null);
      this.nome = '';
      this.aviso.set(
        'Mesa ' + corpo.nome + ' cadastrada. Use as páginas de mesas para localizar o cadastro.',
      );
    });
  }

  async confirmarSenha(senha: HTMLInputElement): Promise<void> {
    await this.executar(async (vigente) => {
      const valor = senha.value;
      senha.value = '';
      await this.sessao.api('/api/v1/auth/reautenticar', 'POST', { senha: valor });
      if (!vigente()) return;
      this.aviso.set('Senha confirmada para configuração administrativa.');
    });
  }

  async atividade(mesa: Mesa): Promise<void> {
    await this.executar(async (vigente) => {
      await this.sessao.api('/api/v1/operacao/mesas/' + mesa.id, 'PUT', {
        versao: mesa.versao,
        nome: mesa.nome,
        ativa: !mesa.ativa,
      });
      if (!vigente()) return;
      this.aviso.set('Atividade da mesa atualizada.');
    });
  }

  async abrir(mesa: Mesa): Promise<void> {
    const chave = this.contexto() + ':' + mesa.id;
    const intencaoId = this.aberturas.get(chave) ?? crypto.randomUUID();
    this.aberturas.set(chave, intencaoId);
    await this.executar(async (vigente) => {
      const resultado = await this.sessao.api<AberturaAtendimento>(
        '/api/v1/operacao/mesas/' + mesa.id + '/abrir',
        'POST',
        { intencaoId },
      );
      this.aberturas.delete(chave);
      if (!vigente() || !this.tem('pedido.criar_assistido')) return;
      this.abertura.set(resultado);
      this.aviso.set(
        resultado.codigoTemporario
          ? 'Atendimento aberto. Forneça o código apenas ao grupo desta mesa.'
          : 'Atendimento recuperado. Gere outro código para autorizar participantes.',
      );
    });
  }

  async gerarCodigo(mesa: Mesa): Promise<void> {
    await this.executar(async (vigente) => {
      const versao =
        mesa.atendimentoVersao ??
        (this.abertura()?.mesaId === mesa.id ? this.abertura()!.versao : null);
      if (versao === null) throw new Error('Atualize as mesas antes de gerar outro código.');
      const resultado = await this.sessao.api<AberturaAtendimento>(
        '/api/v1/operacao/mesas/' + mesa.id + '/codigo',
        'POST',
        { versao },
      );
      if (!vigente() || !this.tem('pedido.criar_assistido')) return;
      this.abertura.set(resultado);
      this.aviso.set('Código rotacionado. O código anterior não autoriza novas participações.');
    });
  }

  async abrirComanda(mesa: Mesa): Promise<void> {
    if (!mesa.comandaId || this.ocupado()) return;
    const selecao = ++this.selecaoComanda;
    await this.executar(async (vigente) => {
      const comanda = await this.sessao.api<Comanda>('/api/v1/comandas/' + mesa.comandaId);
      if (vigente() && selecao === this.selecaoComanda && this.financeiro())
        this.comanda.set(comanda);
    });
  }

  async fechar(acao: 'iniciar-fechamento' | 'reabrir' | 'concluir'): Promise<void> {
    const conta = this.comanda();
    if (!conta || this.ocupado()) return;
    const selecao = ++this.selecaoComanda;
    await this.executar(async (vigente) => {
      const comanda = await this.sessao.api<Comanda>(
        '/api/v1/comandas/' + conta.id + '/' + acao,
        'POST',
        {
          versao: conta.versao,
        },
      );
      if (!vigente() || selecao !== this.selecaoComanda || !this.financeiro()) return;
      this.comanda.set(comanda);
      this.aviso.set('Estado da comanda confirmado.');
    });
  }

  async atender(solicitacao: SolicitacaoMesa): Promise<void> {
    await this.executar(async (vigente) => {
      await this.sessao.api(
        '/api/v1/operacao/mesas/solicitacoes/' + solicitacao.id + '/atender',
        'POST',
        { versao: solicitacao.versao },
      );
      if (!vigente()) return;
      this.aviso.set('Solicitação marcada como atendida.');
    });
  }

  private async executar(acao: (vigente: () => boolean) => Promise<void>): Promise<void> {
    if (this.ocupado()) return;
    const geracao = this.geracao;
    const contexto = this.contexto();
    const vigente = () => geracao === this.geracao && contexto === this.contexto();
    this.ocupado.set(true);
    this.erroAcao.set('');
    this.aviso.set('');
    try {
      await acao(vigente);
      if (vigente()) await this.carregar();
    } catch (error) {
      if (vigente())
        this.erroAcao.set(
          mensagemErro(error) + ' Consulte o estado antes de repetir uma alteração.',
        );
    } finally {
      if (vigente()) this.ocupado.set(false);
    }
  }
}
