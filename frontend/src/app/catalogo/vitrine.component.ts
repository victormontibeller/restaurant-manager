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
import { ContextoVitrineService } from '../rotas/contexto-vitrine.service';
import { SessaoMesaService } from '../mesas/sessao-mesa.service';
import { CarrinhoComponent } from '../carrinho/carrinho.component';
import { CarrinhoService } from '../carrinho/carrinho.service';
import { ContextoCarrinho, ItemCarrinho, LinhaCarrinho } from '../carrinho/modelos';
import { CatalogoApiService } from './catalogo-api.service';
import { CatalogoMidiaService } from './catalogo-midia.service';
import {
  ConfiguradorProdutoComponent,
  DetalhesItemConfigurado,
} from './configurador-produto.component';
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
  @ViewChild(CarrinhoComponent) private carrinhoLateral?: CarrinhoComponent;
  private readonly api = inject(CatalogoApiService);
  private readonly catalogoMidia = inject(CatalogoMidiaService, { optional: true });
  readonly carrinho = inject(CarrinhoService);
  readonly favoritos = inject(FavoritosService);
  readonly marca = inject(MarcaService);
  readonly mesaSessao = inject(SessaoMesaService);
  private readonly contextoVitrine = inject(ContextoVitrineService, { optional: true });
  private geracao = 0;
  private destruido = false;
  private requisicao: AbortController | null = null;
  readonly unidades = signal<Unidade[]>([]);
  readonly unidadeId = signal('');
  readonly canalSelecionado = signal<Canal>('DELIVERY');
  readonly trocaPendente = signal<ContextoCarrinho | null>(null);
  readonly produtos = signal<ProdutoPublico[]>([]);
  readonly categorias = signal<Categoria[]>([]);
  readonly selecionado = signal<ProdutoPublico | null>(null);
  readonly linhaEditada = signal<LinhaCarrinho | null>(null);
  readonly itemEditado = signal<ItemCarrinho | null>(null);
  readonly somenteFavoritos = signal(false);
  readonly somenteSugestoes = signal(false);
  readonly arrastandoCarrossel = signal(false);
  private dragAtivo = false;
  private dragStartX = 0;
  private dragScrollLeft = 0;
  private dragMoveu = false;
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
    effect(() => {
      const participante = this.mesaSessao.participante();
      const unidades = this.unidades();
      if (!participante || !unidades.length) return;
      const unidadeMesa = unidades.find((u) => u.id === participante.unidadeId) ?? unidades[0];
      if (this.unidadeId() !== unidadeMesa.id || this.canalSelecionado() !== 'MESA') {
        untracked(() =>
          this.aplicarContexto({
            unidadeId: unidadeMesa.id,
            unidadeNome: unidadeMesa.nome,
            canal: 'MESA',
          }),
        );
      }
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
      const participante = this.mesaSessao.participante();
      const contexto = this.carrinho.contexto();
      if (participante) {
        const unidadeMesa =
          this.unidades().find((u) => u.id === participante.unidadeId) ?? this.unidades()[0];
        this.aplicarContexto({
          unidadeId: unidadeMesa.id,
          unidadeNome: unidadeMesa.nome,
          canal: 'MESA',
        });
        return;
      }
      const preferida = this.contextoVitrine?.unidadeId() || contexto?.unidadeId || '';
      const unidade = this.unidades().find((u) => u.id === preferida) ?? this.unidades()[0];
      const canalInicial: Canal =
        this.unidadeExterna() && contexto?.canal
          ? contexto.canal
          : contexto?.canal && contexto.canal !== 'MESA'
            ? contexto.canal
            : this.canalSelecionado() === 'MESA' && !this.unidadeExterna()
              ? 'DELIVERY'
              : this.canalSelecionado();
      this.aplicarContexto({
        unidadeId: unidade.id,
        unidadeNome: unidade.nome,
        canal: canalInicial,
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
    if (
      !this.somenteSugestoes() &&
      (this.somenteFavoritos() || !!this.categoriaId || !!this.termo.trim())
    ) {
      return false;
    }
    return this.produtos().some(
      (p) =>
        p.sugerido &&
        (!this.categoriaId || p.categoriaId === this.categoriaId) &&
        this.correspondeBusca(p),
    );
  }

  temProdutosNaCategoria(cat: Categoria): boolean {
    if (this.somenteSugestoes()) return false;
    if (this.categoriaId && this.categoriaId !== cat.id) return false;
    return this.produtos().some(
      (p) => p.categoriaId === cat.id && this.correspondeBusca(p, cat.nome),
    );
  }

  temQualquerProdutoVisivel(): boolean {
    return this.produtos().some(
      (p) =>
        (!this.somenteSugestoes() || p.sugerido) &&
        (!this.categoriaId || p.categoriaId === this.categoriaId) &&
        this.correspondeBusca(p),
    );
  }

  modoPdv(): boolean {
    return !!this.unidadeExterna();
  }

  abrirRevisaoPdv(acionador?: EventTarget | null): void {
    void this.carrinhoLateral?.abrirRevisao(acionador);
  }

  canaisDisponiveis(): readonly { valor: Canal; nome: string }[] {
    if (this.mesaSessao.participante()) {
      return this.canais.filter((c) => c.valor === 'MESA');
    }
    if (this.unidadeExterna()) {
      return this.canais;
    }
    return this.canais.filter((c) => c.valor !== 'MESA');
  }

  escolherCategoria(id: string): void {
    this.somenteSugestoes.set(false);
    this.somenteFavoritos.set(false);
    this.categoriaId = id;
    void this.carregar(0);
  }

  deslizarSugestoes(trilho: HTMLElement, direcao: -1 | 1): void {
    const passo = Math.max(240, Math.round(trilho.clientWidth * 0.72));
    trilho.scrollBy({ left: passo * direcao, behavior: 'smooth' });
  }

  iniciarArrasteCarrossel(evento: MouseEvent, trilho: HTMLElement): void {
    if (evento.button !== 0) return;
    const alvo = evento.target as HTMLElement | null;
    if (alvo?.closest('button, a, input, select')) return;
    this.dragAtivo = true;
    this.dragMoveu = false;
    this.dragStartX = evento.pageX;
    this.dragScrollLeft = trilho.scrollLeft;
    this.arrastandoCarrossel.set(true);
  }

  moverArrasteCarrossel(evento: MouseEvent, trilho: HTMLElement): void {
    if (!this.dragAtivo) return;
    const delta = evento.pageX - this.dragStartX;
    if (Math.abs(delta) > 6) this.dragMoveu = true;
    if (this.dragMoveu) {
      evento.preventDefault();
      trilho.scrollLeft = this.dragScrollLeft - delta;
    }
  }

  finalizarArrasteCarrossel(): void {
    if (!this.dragAtivo) return;
    this.dragAtivo = false;
    this.arrastandoCarrossel.set(false);
    setTimeout(() => {
      this.dragMoveu = false;
    }, 60);
  }

  aoClicarCartaoSugestao(produto: ProdutoPublico, evento: Event): void {
    if (this.dragMoveu) {
      evento.preventDefault();
      evento.stopPropagation();
      return;
    }
    void this.configurar(produto.id, null, evento.currentTarget);
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
    if (ativar) {
      this.somenteSugestoes.set(false);
      this.categoriaId = '';
    }
    await this.carregar(0);
  }

  async escolherSugestoes(): Promise<void> {
    if (this.ocupado()) return;
    this.somenteSugestoes.set(true);
    this.somenteFavoritos.set(false);
    this.categoriaId = '';
    await this.carregar(0);
  }

  async limparFiltrosVitrine(): Promise<void> {
    this.somenteSugestoes.set(false);
    this.somenteFavoritos.set(false);
    this.categoriaId = '';
    this.termo = '';
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
      } else if (this.somenteSugestoes()) {
        produtos = produtos.filter((item) => item.sugerido);
      }
      if (signal.aborted || this.destruido) return;
      this.catalogoMidia?.registrar?.(produtos);
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
    itemAnterior: ItemCarrinho | null = null,
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
      this.itemEditado.set(itemAnterior ? structuredClone(itemAnterior) : null);
      setTimeout(() => {
        const dialogo = this.configuracao?.nativeElement;
        if (dialogo && !dialogo.open) dialogo.showModal();
      }, 0);
    });
  }

  categoriaDoProduto(produto: ProdutoPublico | null): string {
    if (!produto) return '';
    return this.categorias().find((c) => c.id === produto.categoriaId)?.nome ?? '';
  }

  editarItem(item: ItemCarrinho): void {
    void this.configurar(item.linha.produtoId, item.linha, document.activeElement, item);
  }

  guardar(linha: LinhaCarrinho, detalhes?: DetalhesItemConfigurado): void {
    const produto = this.selecionado();
    if (
      produto &&
      this.carrinho.guardar(linha, produto.nome, { ...detalhes, midiaId: produto.midiaId })
    ) {
      this.fecharConfiguracao();
      this.aviso.set('Composição adicionada ao carrinho. Confira o resumo abaixo.');
    }
  }

  fecharConfiguracao(): void {
    this.configuracao?.nativeElement.close();
    if (this.selecionado()) this.focoAnterior?.focus();
    this.selecionado.set(null);
    this.linhaEditada.set(null);
    this.itemEditado.set(null);
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
    this.contextoVitrine?.selecionarUnidade(contexto.unidadeId);
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
