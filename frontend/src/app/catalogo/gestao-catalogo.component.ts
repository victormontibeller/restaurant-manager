import { Component, DestroyRef, EventEmitter, Output, inject, signal } from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { CatalogoPendenteService, EdicaoCatalogoPendente } from './catalogo-pendente.service';
import { MidiaPendenteService } from './midia-pendente.service';
import { CategoriaEditorComponent } from './categoria-editor.component';
import { ProdutoEditorComponent } from './produto-editor.component';
import { OfertaUnidadeComponent } from './oferta-unidade.component';
import {
  AcessosCatalogo,
  Categoria,
  Pagina,
  Produto,
  ProdutoPublico,
  mensagemErro,
} from './modelos';

@Component({
  selector: 'app-gestao-catalogo',
  imports: [CategoriaEditorComponent, ProdutoEditorComponent, OfertaUnidadeComponent],
  templateUrl: './gestao-catalogo.component.html',
  styleUrl: './catalogo.css',
})
export class GestaoCatalogoComponent {
  @Output() bloqueio = new EventEmitter<boolean>();
  private readonly sessao = inject(SessaoService);
  private readonly pendencias = inject(CatalogoPendenteService);
  private readonly midiasPendentes = inject(MidiaPendenteService);
  private destruido = false;
  private componentesPagina = 0;
  readonly acessos = signal<AcessosCatalogo | null>(null);
  readonly categorias = signal<Categoria[]>([]);
  readonly produtos = signal<(Produto | ProdutoPublico)[]>([]);
  readonly componentes = signal<Produto[]>([]);
  readonly componentesTemMais = signal(true);
  readonly ocupado = signal(false);
  readonly incerto = signal(false);
  readonly filhoBloqueado = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly aba = signal<'produtos' | 'categorias'>('produtos');
  readonly pagina = signal(0);
  readonly temMais = signal(false);
  readonly criando = signal(false);
  readonly unidadeOperacional = signal('');
  readonly categoriaSelecionada = signal<Categoria | null>(null);
  readonly produtoSelecionado = signal<Produto | null>(null);
  readonly ofertaSelecionada = signal<{ id: string; nome: string } | null>(null);

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
    });
    void this.iniciar();
  }

  podeEditar(): boolean {
    return this.acessos()?.acoes.includes('catalogo.editar') ?? false;
  }

  podeConsultar(): boolean {
    return this.acessos()?.acoes.includes('catalogo.consultar') ?? false;
  }

  podeAlterarOferta(): boolean {
    return this.acessos()?.acoes.includes('catalogo.alterar_unidade') ?? false;
  }

  travado(): boolean {
    return this.ocupado() || this.incerto() || this.filhoBloqueado();
  }

  async iniciar(): Promise<void> {
    if (this.ocupado()) return;
    await this.executar(async () => {
      const acesso = await this.sessao.api<AcessosCatalogo>('/api/v1/acessos/efetivos');
      if (this.destruido) return;
      this.acessos.set(acesso);
      this.unidadeOperacional.set(acesso.unidades[0]?.id ?? '');
      if (this.podeEditar()) await this.consultarCategorias();
      if (this.podeConsultar()) await this.consultarProdutos(0);
      const pendente = this.estadoPendente()?.();
      if (pendente?.tipo === 'oferta') {
        this.ofertaSelecionada.set({
          id: pendente.dados.produtoId,
          nome: 'produto com alteração pendente',
        });
      } else if (pendente) {
        this.incerto.set(true);
        this.aviso.set('Há uma alteração pendente desta conta. Consulte seu resultado.');
      }
      const pessoa = this.sessao.identidade();
      const imagem = pessoa && this.midiasPendentes.daConta(pessoa.usuarioId)();
      if (imagem && this.podeEditar()) {
        await this.carregarReferencias(imagem.produto);
        if (this.destruido) return;
        this.criando.set(imagem.novo);
        this.produtoSelecionado.set(structuredClone(imagem.produto));
        this.filhoBloqueado.set(true);
        this.aviso.set(
          'O envio de imagem desta conta foi preservado. Consulte seu resultado para retomar a edição.',
        );
      }
    });
  }

  abrirAba(aba: 'produtos' | 'categorias'): void {
    if (this.travado()) return;
    this.aba.set(aba);
    this.categoriaSelecionada.set(null);
    this.produtoSelecionado.set(null);
    this.ofertaSelecionada.set(null);
  }

  novaCategoria(): void {
    if (this.travado()) return;
    this.criando.set(true);
    this.categoriaSelecionada.set({ id: crypto.randomUUID(), nome: '', ativa: true, versao: 0 });
  }

  editarCategoria(categoria: Categoria): void {
    if (this.travado()) return;
    this.criando.set(false);
    this.categoriaSelecionada.set(structuredClone(categoria));
  }

  async novoProduto(): Promise<void> {
    if (this.travado()) return;
    this.criando.set(true);
    this.ofertaSelecionada.set(null);
    this.produtoSelecionado.set({
      id: crypto.randomUUID(),
      versao: 0,
      nome: '',
      descricao: '',
      categoriaId: '',
      tipo: 'SIMPLES',
      ativo: true,
      sugerido: false,
      midiaId: null,
      adicionais: [],
      grupos: [],
    });
    if (!this.componentes().length) await this.carregarComponentes();
  }

  async editarProduto(id: string): Promise<void> {
    if (this.travado()) return;
    await this.executar(async () => {
      const produto = await this.sessao.api<Produto>('/api/v1/gestao/catalogo/produtos/' + id);
      await this.carregarReferencias(produto);
      if (this.destruido) return;
      this.criando.set(false);
      this.ofertaSelecionada.set(null);
      this.produtoSelecionado.set(produto);
    });
    if (!this.componentes().length && !this.destruido) await this.carregarComponentes();
  }

  abrirOferta(produto: { id: string; nome: string }): void {
    if (this.travado()) return;
    this.produtoSelecionado.set(null);
    this.ofertaSelecionada.set({ id: produto.id, nome: produto.nome });
  }

  async trocarUnidade(id: string): Promise<void> {
    if (this.travado()) return;
    this.unidadeOperacional.set(id);
    this.ofertaSelecionada.set(null);
    await this.carregarProdutos(0);
  }

  async carregarProdutos(pagina: number): Promise<void> {
    if (this.travado() || pagina < 0) return;
    await this.executar(() => this.consultarProdutos(pagina));
  }

  async carregarComponentes(): Promise<void> {
    if (this.travado() || !this.componentesTemMais() || !this.podeEditar()) return;
    await this.executar(async () => {
      const pagina = await this.sessao.api<Pagina<Produto>>(
        '/api/v1/gestao/catalogo/produtos?pagina=' + this.componentesPagina,
      );
      if (this.destruido) return;
      const itens = new Map(this.componentes().map((item) => [item.id, item]));
      for (const item of pagina.itens) if (item.tipo === 'SIMPLES') itens.set(item.id, item);
      this.componentes.set([...itens.values()]);
      this.componentesTemMais.set(pagina.temMais);
      this.componentesPagina++;
    });
  }

  async salvarCategoria(dados: Categoria): Promise<void> {
    await this.salvar({ tipo: 'categoria', novo: this.criando(), dados });
  }

  async salvarProduto(dados: Produto): Promise<void> {
    await this.salvar({ tipo: 'produto', novo: this.criando(), dados });
  }

  async reconciliar(): Promise<void> {
    const estado = this.estadoPendente();
    const pendente = estado?.();
    if (!estado || !pendente || this.ocupado()) return;
    await this.executar(async () => {
      if (pendente.tipo === 'oferta') return;
      let atual: Categoria | Produto | undefined;
      if (pendente.tipo === 'categoria') {
        await this.consultarCategorias();
        atual = this.categorias().find((item) => item.id === pendente.dados.id);
      } else {
        try {
          atual = await this.sessao.api<Produto>(
            '/api/v1/gestao/catalogo/produtos/' + pendente.dados.id,
          );
        } catch (error) {
          if (!(error instanceof ApiFailure && error.status === 404 && pendente.novo)) throw error;
        }
      }
      if (this.destruido) return;
      if (!atual && !pendente.novo)
        throw new Error(
          'O registro não está mais acessível. Atualize seus acessos antes de continuar.',
        );
      this.criando.set(!atual);
      this.aba.set(pendente.tipo === 'categoria' ? 'categorias' : 'produtos');
      if (pendente.tipo === 'categoria')
        this.categoriaSelecionada.set((atual ?? pendente.dados) as Categoria);
      else this.produtoSelecionado.set((atual ?? pendente.dados) as Produto);
      estado.set(null);
      this.incerto.set(false);
      this.aviso.set(
        atual
          ? 'Versão atual recuperada. Revise os campos antes de fazer uma nova alteração.'
          : 'Criação não encontrada no servidor. O rascunho e seu identificador foram preservados para nova tentativa.',
      );
    });
  }

  bloquearFilho(bloqueado: boolean): void {
    this.filhoBloqueado.set(bloqueado);
    this.emitirBloqueio();
  }

  private async salvar(
    pendente: Exclude<EdicaoCatalogoPendente, { tipo: 'oferta' }>,
  ): Promise<void> {
    const estado = this.estadoPendente();
    if (!estado || this.travado() || !this.podeEditar()) return;
    estado.set(structuredClone(pendente));
    await this.executar(async () => {
      const base =
        '/api/v1/gestao/catalogo/' + (pendente.tipo === 'categoria' ? 'categorias' : 'produtos');
      try {
        await this.sessao.api(
          base + (pendente.novo ? '' : '/' + pendente.dados.id),
          pendente.novo ? 'POST' : 'PUT',
          pendente.dados,
        );
        estado.set(null);
      } catch (error) {
        const incerto = !(
          error instanceof ApiFailure &&
          error.status >= 400 &&
          error.status < 500 &&
          error.status !== 409
        );
        if (!incerto) estado.set(null);
        if (!this.destruido) this.incerto.set(incerto);
        throw error;
      }
      if (this.destruido) return;
      this.categoriaSelecionada.set(null);
      this.produtoSelecionado.set(null);
      if (pendente.tipo === 'categoria') await this.consultarCategorias();
      else {
        this.componentes.set([]);
        this.componentesPagina = 0;
        this.componentesTemMais.set(true);
        await this.consultarProdutos(this.pagina());
      }
      this.aviso.set(
        pendente.tipo === 'categoria'
          ? 'Categoria salva no servidor.'
          : 'Produto salvo no servidor. Configure sua oferta nas unidades.',
      );
    });
  }

  private async consultarCategorias(): Promise<void> {
    const categorias: Categoria[] = [];
    for (let numero = 0; numero <= 10000; numero++) {
      const pagina = await this.sessao.api<Pagina<Categoria>>(
        '/api/v1/gestao/catalogo/categorias?pagina=' + numero,
      );
      if (this.destruido) return;
      categorias.push(...pagina.itens);
      if (!pagina.temMais) {
        this.categorias.set(categorias);
        return;
      }
    }
    throw new Error('A consulta excedeu o limite de páginas do catálogo.');
  }

  private async carregarReferencias(produto: Produto): Promise<void> {
    const referencias = [
      ...new Set(produto.grupos.flatMap((grupo) => grupo.opcoes.map((opcao) => opcao.produtoId))),
    ];
    for (const referencia of referencias) {
      if (this.destruido) return;
      if (!this.componentes().some((item) => item.id === referencia)) {
        const componente = await this.sessao.api<Produto>(
          '/api/v1/gestao/catalogo/produtos/' + referencia,
        );
        if (!this.destruido) this.componentes.update((itens) => [...itens, componente]);
      }
    }
  }

  private async consultarProdutos(pagina: number): Promise<void> {
    if (!this.podeEditar() && !this.unidadeOperacional()) return;
    const rota = this.podeEditar()
      ? '/api/v1/gestao/catalogo/produtos?'
      : '/api/v1/operacao/catalogo?unidadeId=' + this.unidadeOperacional() + '&';
    const resultado = await this.sessao.api<Pagina<Produto | ProdutoPublico>>(
      rota + 'pagina=' + pagina,
    );
    if (this.destruido) return;
    this.produtos.set(resultado.itens);
    this.pagina.set(pagina);
    this.temMais.set(resultado.temMais);
  }

  private estadoPendente() {
    const pessoa = this.sessao.identidade();
    return pessoa ? this.pendencias.daConta(pessoa.usuarioId) : null;
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.emitirBloqueio();
    try {
      await acao();
    } catch (error) {
      if (!this.destruido) this.erro.set(mensagemErro(error));
    } finally {
      if (!this.destruido) {
        this.ocupado.set(false);
        this.emitirBloqueio();
      }
    }
  }

  private emitirBloqueio(): void {
    this.bloqueio.emit(this.travado());
  }
}
