import {
  Component,
  Input,
  DestroyRef,
  ElementRef,
  ViewChild,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '../ui/button';
import { ApiFailure } from '../identidade/sessao.service';
import { MarcaService } from '../rotas/marca.service';
import { CarrinhoComponent } from '../carrinho/carrinho.component';
import { CarrinhoService } from '../carrinho/carrinho.service';
import { ContextoCarrinho, ItemCarrinho, LinhaCarrinho } from '../carrinho/modelos';
import { CatalogoApiService } from './catalogo-api.service';
import { ConfiguradorProdutoComponent } from './configurador-produto.component';
import { FavoritosService } from './favoritos.service';
import {
  CANAIS,
  Canal,
  CatalogoPublico,
  Categoria,
  ProdutoPublico,
  Unidade,
  mensagemErro,
  moeda,
} from './modelos';

@Component({
  selector: 'app-vitrine',
  imports: [ConfiguradorProdutoComponent, CarrinhoComponent, RouterLink, HlmButton],
  templateUrl: './vitrine.component.html',
  styleUrls: ['./catalogo.css', './vitrine.css'],
})
export class VitrineComponent {
  @Input() modo: 'cardapio' | 'carrinho' = 'cardapio';
  readonly unidadeExterna = input<string | undefined>();
  private focoAnterior: HTMLElement | null = null;
  @ViewChild('configuracao') private configuracao?: ElementRef<HTMLDialogElement>;
  @ViewChild('alerta') private alerta?: ElementRef<HTMLElement>;
  private readonly api = inject(CatalogoApiService);
  readonly carrinho = inject(CarrinhoService);
  readonly favoritos = inject(FavoritosService);
  readonly marca = inject(MarcaService);
  private geracao = 0;
  private destruido = false;
  private requisicao: AbortController | null = null;
  readonly unidades = signal<Unidade[]>([]);
  readonly unidadeId = signal('');
  readonly canalSelecionado = signal<Canal>('RETIRADA');
  readonly trocaPendente = signal<ContextoCarrinho | null>(null);
  readonly produtos = signal<ProdutoPublico[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly selecionado = signal<ProdutoPublico | null>(null);
  readonly linhaEditada = signal<LinhaCarrinho | null>(null);
  readonly somenteFavoritos = signal(false);
  readonly ocupado = signal(false);
  readonly aberto = signal(false);
  readonly consultadoEm = signal('');
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly pagina = signal(0);
  readonly temMais = signal(false);
  readonly canais = CANAIS;
  readonly moeda = moeda;
  termo = '';
  categoriaId = '';

  constructor() {
    const rede = () => {
      this.cancelarConsulta();
      this.aberto.set(false);
      this.fecharConfiguracao();
    };
    window.addEventListener('offline', rede);
    const timer = setInterval(() => {
      if (this.consultadoEm() && Date.now() - Date.parse(this.consultadoEm()) >= 60000)
        this.aberto.set(false);
    }, 1000);
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.cancelarConsulta();
      clearInterval(timer);
      window.removeEventListener('offline', rede);
    });
    effect(() => {
      if (!this.favoritos.cliente() && this.somenteFavoritos()) {
        this.somenteFavoritos.set(false);
        this.produtos.set([]);
        this.cancelarConsulta();
        if (this.unidadeId()) untracked(() => void this.carregar(0));
      }
    });
    effect(() => {
      const externa = this.unidadeExterna();
      const unidade = this.unidades().find((item) => item.id === externa);
      if (unidade)
        untracked(() =>
          this.solicitarTroca({
            unidadeId: unidade.id,
            unidadeNome: unidade.nome,
            canal: this.canalSelecionado(),
          }),
        );
    });
    void this.carregarUnidades();
  }

  unidadeAtual(): Unidade | undefined {
    return this.unidades().find((item) => item.id === this.unidadeId());
  }

  horarioConsulta(): string {
    if (!this.consultadoEm()) return '';
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: this.unidadeAtual()?.fuso ?? 'UTC',
    }).format(new Date(this.consultadoEm()));
  }

  async carregarUnidades(): Promise<void> {
    if (this.ocupado()) return;
    await this.executar(async (signal) => {
      const unidades = await this.api.consultar<Unidade[]>('/api/v1/unidades', signal);
      if (!signal.aborted && !this.destruido) this.unidades.set(unidades);
    });
    if (!this.destruido && !this.unidadeId() && this.unidades().length) {
      const contexto = this.carrinho.contexto();
      const unidade =
        this.unidades().find((u) => u.id === contexto?.unidadeId) ?? this.unidades()[0];
      this.aplicarContexto({
        unidadeId: unidade.id,
        unidadeNome: unidade.nome,
        canal: contexto?.canal ?? this.canalSelecionado(),
      });
    }
  }

  quantidadeItens(): number {
    return this.carrinho.itens().reduce((total, item) => total + item.linha.quantidade, 0);
  }

  quantidadeDoProdutoNoCarrinho(produtoId: string): number {
    return this.carrinho
      .itens()
      .reduce(
        (soma, item) => (item.linha.produtoId === produtoId ? soma + item.linha.quantidade : soma),
        0,
      );
  }

  totalEstimadoCarrinho(): string {
    const resumo = this.carrinho.resumo();
    if (resumo) return moeda(resumo.total);
    let centavos = 0;
    const mapa = new Map(this.produtos().map((p) => [p.id, p]));
    for (const item of this.carrinho.itens()) {
      const p = mapa.get(item.linha.produtoId);
      if (!p) continue;
      let unit = Math.round((Number(p.preco) || 0) * 100);
      for (const esc of item.linha.escolhas) {
        const g = p.grupos?.find((gr) => gr.id === esc.grupoId);
        const op = g?.opcoes.find((o) => o.id === esc.opcaoId);
        if (op) {
          unit += Math.round((Number(op.acrescimo) || 0) * 100) * esc.quantidade;
          for (const ad of esc.adicionais) {
            const a = op.adicionais.find((x) => x.id === ad.adicionalId);
            if (a) unit += Math.round((Number(a.preco) || 0) * 100) * ad.quantidade;
          }
        }
      }
      for (const ad of item.linha.adicionais) {
        const a = p.adicionais?.find((x) => x.id === ad.adicionalId);
        if (a) unit += Math.round((Number(a.preco) || 0) * 100) * ad.quantidade;
      }
      centavos += unit * item.linha.quantidade;
    }
    return centavos > 0
      ? moeda((centavos / 100).toFixed(2))
      : `${this.quantidadeItens()} ${this.quantidadeItens() === 1 ? 'item' : 'itens'}`;
  }

  private normalizarTexto(texto: string): string {
    const base = (texto || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    return base.replace(/oes\b/g, 'ao').replace(/aes\b/g, 'ao').replace(/ais\b/g, 'al');
  }

  correspondeBusca(produto: ProdutoPublico, extra = ''): boolean {
    const busca = this.normalizarTexto(this.termo.trim());
    if (!busca) return true;
    const alvo = this.normalizarTexto(produto.nome + ' ' + produto.descricao + ' ' + extra);
    return alvo.includes(busca);
  }

  temSugestoesVisiveis(): boolean {
    return this.produtos().some(
      (p) =>
        p.sugerido &&
        (!this.categoriaId || p.categoriaId === this.categoriaId) &&
        this.correspondeBusca(p),
    );
  }

  temProdutosNaCategoria(cat: Categoria): boolean {
    if (this.categoriaId && this.categoriaId !== cat.id) return false;
    const exibirSugeridos = !this.termo.trim() && !this.categoriaId && !this.somenteFavoritos();
    return this.produtos().some(
      (p) =>
        p.categoriaId === cat.id &&
        (!p.sugerido || exibirSugeridos) &&
        this.correspondeBusca(p, cat.nome),
    );
  }

  temQualquerProdutoVisivel(): boolean {
    return this.produtos().some(
      (p) => (!this.categoriaId || p.categoriaId === this.categoriaId) && this.correspondeBusca(p),
    );
  }

  escolherCategoria(id: string): void {
    this.categoriaId = id;
    void this.carregar(0);
  }

  selecionarUnidade(select: HTMLSelectElement): void {
    const unidade = this.unidades().find((item) => item.id === select.value);
    select.value = this.unidadeId();
    if (unidade)
      this.solicitarTroca({
        unidadeId: unidade.id,
        unidadeNome: unidade.nome,
        canal: this.canalSelecionado(),
      });
  }

  selecionarCanal(select: HTMLSelectElement): void {
    const canal = select.value as Canal;
    select.value = this.canalSelecionado();
    const unidade = this.unidadeAtual();
    if (unidade) this.solicitarTroca({ unidadeId: unidade.id, unidadeNome: unidade.nome, canal });
    else this.canalSelecionado.set(canal);
  }

  confirmarTroca(): void {
    const contexto = this.trocaPendente();
    if (contexto) this.aplicarContexto(contexto);
  }

  filtrar(event: Event): void {
    event.preventDefault();
    void this.carregar(0);
  }

  async abrirFavoritos(ativar: boolean): Promise<void> {
    if (this.ocupado() || (ativar && !this.favoritos.cliente())) return;
    this.somenteFavoritos.set(ativar);
    await this.carregar(0);
  }

  async consultarFavoritos(): Promise<void> {
    await this.favoritos.consultar();
    if (this.somenteFavoritos() && !this.favoritos.incerto()) await this.carregar(0);
  }

  async carregar(pagina: number): Promise<void> {
    if (!this.unidadeId() || pagina < 0 || this.ocupado() || !this.carrinho.online()) return;
    this.fecharConfiguracao();
    await this.executar(async (signal) => {
      const filtros = new URLSearchParams({
        unidadeId: this.unidadeId(),
        canal: this.canalSelecionado(),
        pagina: String(pagina),
      });
      if (this.termo.trim()) filtros.set('busca', this.termo.trim());
      if (this.categoriaId) filtros.set('categoriaId', this.categoriaId);
      const resultado = await this.api.consultar<CatalogoPublico>(
        '/api/v1/catalogo?' + filtros,
        signal,
      );
      let produtos = resultado.itens;
      let temMais = resultado.temMais;
      if (this.somenteFavoritos()) {
        const favoritos = await this.consultarProdutosFavoritos(signal);
        const filtrados = favoritos.filter(
          (item) =>
            (!this.categoriaId || item.categoriaId === this.categoriaId) &&
            (item.nome + ' ' + item.descricao)
              .toLocaleLowerCase('pt-BR')
              .includes(this.termo.trim().toLocaleLowerCase('pt-BR')),
        );
        produtos = filtrados.slice(pagina * 50, (pagina + 1) * 50);
        temMais = filtrados.length > (pagina + 1) * 50;
      }
      if (signal.aborted || this.destruido) return;
      this.produtos.set(produtos);
      this.categorias.set(resultado.categorias);
      this.aberto.set(resultado.aberto);
      this.consultadoEm.set(resultado.consultadoEm);
      this.temMais.set(temMais);
      this.pagina.set(pagina);
    });
  }

  async configurar(
    id: string,
    linha: LinhaCarrinho | null = null,
    acionador: EventTarget | null = document.activeElement,
  ): Promise<void> {
    if (this.ocupado() || !this.carrinho.online()) return;
    // O carregamento desabilita o botão e o navegador pode retirar seu foco.
    const origem = acionador instanceof HTMLElement ? acionador : null;
    await this.executar(async (signal) => {
      const produto = await this.api.consultar<ProdutoPublico>(this.rotaProduto(id), signal);
      if (signal.aborted || this.destruido) return;
      this.focoAnterior = origem;
      this.selecionado.set(produto);
      this.linhaEditada.set(linha ? structuredClone(linha) : null);
      setTimeout(() => {
        const dialogo = this.configuracao?.nativeElement;
        if (dialogo && !dialogo.open) dialogo.showModal();
      }, 0);
    });
  }

  editarItem(item: ItemCarrinho): void {
    void this.configurar(item.linha.produtoId, item.linha);
  }

  guardar(linha: LinhaCarrinho): void {
    const produto = this.selecionado();
    if (produto && this.carrinho.guardar(linha, produto.nome)) {
      this.fecharConfiguracao();
      this.aviso.set('Composição adicionada ao carrinho. Confira o resumo abaixo.');
    }
  }

  fecharConfiguracao(): void {
    this.configuracao?.nativeElement.close();
    if (this.selecionado()) this.focoAnterior?.focus();
    this.selecionado.set(null);
    this.linhaEditada.set(null);
  }

  private solicitarTroca(contexto: ContextoCarrinho): void {
    if (contexto.unidadeId === this.unidadeId() && contexto.canal === this.canalSelecionado())
      return;
    if (this.carrinho.itens().length) this.trocaPendente.set(contexto);
    else this.aplicarContexto(contexto);
  }

  private aplicarContexto(contexto: ContextoCarrinho): void {
    this.cancelarConsulta();
    this.carrinho.definirContexto(contexto);
    this.unidadeId.set(contexto.unidadeId);
    this.canalSelecionado.set(contexto.canal);
    this.trocaPendente.set(null);
    this.produtos.set([]);
    this.categorias.set([]);
    this.aberto.set(false);
    this.consultadoEm.set('');
    this.categoriaId = '';
    this.fecharConfiguracao();
    void this.carregar(0);
  }

  private rotaProduto(id: string): string {
    return (
      '/api/v1/catalogo/' +
      id +
      '?' +
      new URLSearchParams({ unidadeId: this.unidadeId(), canal: this.canalSelecionado() })
    );
  }

  private async consultarProdutosFavoritos(signal: AbortSignal): Promise<ProdutoPublico[]> {
    const produtos: ProdutoPublico[] = [];
    const ids = this.favoritos.ids();
    for (let inicio = 0; inicio < ids.length; inicio += 10) {
      const respostas = await Promise.allSettled(
        ids
          .slice(inicio, inicio + 10)
          .map((id) => this.api.consultar<ProdutoPublico>(this.rotaProduto(id), signal)),
      );
      for (const resposta of respostas) {
        if (resposta.status === 'fulfilled') produtos.push(resposta.value);
        else if (!(resposta.reason instanceof ApiFailure && resposta.reason.status === 404))
          throw resposta.reason;
      }
      if (signal.aborted) return [];
    }
    return produtos;
  }

  private async executar(acao: (signal: AbortSignal) => Promise<void>): Promise<void> {
    const geracao = ++this.geracao;
    const controlador = new AbortController();
    this.requisicao?.abort();
    this.requisicao = controlador;
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    try {
      await acao(controlador.signal);
    } catch (error) {
      if (geracao === this.geracao && !this.destruido) {
        this.aberto.set(false);
        this.erro.set(mensagemErro(error));
        setTimeout(() => this.alerta?.nativeElement.focus(), 0);
      }
    } finally {
      if (geracao === this.geracao && !this.destruido) this.ocupado.set(false);
    }
  }

  private cancelarConsulta(): void {
    this.geracao++;
    this.requisicao?.abort();
    this.ocupado.set(false);
  }
}
