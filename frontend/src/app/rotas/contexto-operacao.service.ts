import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Unidade, mensagemErro } from '../catalogo/modelos';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { SessaoNavegacaoService } from '../identidade/sessao-navegacao.service';
import { AcessosOperacao } from '../pedidos/modelos';

@Injectable({ providedIn: 'root' })
export class ContextoOperacaoService {
  private readonly sessao = inject(SessaoService);
  private readonly inicializacao = inject(SessaoNavegacaoService);
  readonly acoes = signal<string[]>([]);
  readonly perfilEfetivo = signal<string | null>(null);
  readonly unidades = signal<Unidade[]>([]);
  readonly unidadeId = signal('');
  readonly carregando = signal(false);
  readonly erro = signal('');
  readonly administrador = computed(() => this.perfilEfetivo() === 'ADMINISTRADOR');
  readonly unidade = computed(() =>
    this.unidades().find((unidade) => unidade.id === this.unidadeId()),
  );
  private geracao = 0;
  private contaAtual = '';
  private requisicao: Promise<void> | null = null;
  private consumidores = 0;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      const pessoa = this.sessao.identidade();
      const conta = pessoa && pessoa.perfil !== 'CLIENTE' ? pessoa.usuarioId : '';
      if (conta !== this.contaAtual) this.trocarConta(conta);
    });
  }

  tem(acao: string): boolean {
    return this.acoes().includes(acao);
  }

  selecionarUnidade(id: string): void {
    this.unidadeId.set(this.unidades().some((unidade) => unidade.id === id) ? id : '');
  }

  ativar(): void {
    this.consumidores++;
    if (this.consumidores === 1) void this.atualizarContinuamente();
  }

  desativar(): void {
    this.consumidores = Math.max(0, this.consumidores - 1);
    if (!this.consumidores) clearTimeout(this.timer);
  }

  async carregar(): Promise<void> {
    await this.inicializacao.inicializar();
    const pessoa = this.sessao.identidade();
    const conta = pessoa && pessoa.perfil !== 'CLIENTE' ? pessoa.usuarioId : '';
    if (conta !== this.contaAtual) this.trocarConta(conta);
    if (!conta) return;
    if (this.requisicao) return this.requisicao;
    const geracao = this.geracao;
    this.carregando.set(true);
    const requisicao = this.consultar(geracao).finally(() => {
      if (this.requisicao === requisicao) this.requisicao = null;
      if (geracao === this.geracao) this.carregando.set(false);
    });
    this.requisicao = requisicao;
    return requisicao;
  }

  destino(): string {
    if (this.perfilEfetivo() === 'COZINHA' && this.podeCozinha()) return '/cozinha';
    if (this.tem('pedido.consultar')) return '/gestao/pedidos';
    if (this.tem('catalogo.consultar')) return '/gestao/catalogo';
    if (this.administrador()) return '/gestao/unidades';
    if (this.tem('unidade.acompanhar')) return '/gestao/atualizacoes';
    return '/sem-acesso';
  }

  podeCozinha(): boolean {
    return this.tem('cozinha.iniciar') || this.tem('cozinha.concluir');
  }

  private trocarConta(conta: string): void {
    this.contaAtual = conta;
    this.geracao++;
    this.requisicao = null;
    this.acoes.set([]);
    this.perfilEfetivo.set(null);
    this.unidades.set([]);
    this.unidadeId.set('');
    this.erro.set('');
  }

  private async consultar(geracao: number): Promise<void> {
    try {
      const acessos = await this.sessao.api<AcessosOperacao>('/api/v1/acessos/efetivos');
      const unidades = await this.sessao.api<Unidade[]>('/api/v1/operacao/unidades-existentes');
      if (geracao !== this.geracao) return;
      this.perfilEfetivo.set(acessos.perfil);
      this.acoes.set(acessos.acoes);
      this.unidades.set(unidades);
      if (!unidades.some((unidade) => unidade.id === this.unidadeId()))
        this.unidadeId.set(unidades[0]?.id ?? '');
      this.erro.set('');
    } catch (error) {
      if (geracao !== this.geracao) return;
      this.erro.set(mensagemErro(error));
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status)) {
        this.acoes.set([]);
        this.perfilEfetivo.set(null);
        this.unidades.set([]);
        this.unidadeId.set('');
      }
    }
  }

  private async atualizarContinuamente(): Promise<void> {
    clearTimeout(this.timer);
    await this.carregar();
    if (this.consumidores) this.timer = setTimeout(() => void this.atualizarContinuamente(), 5000);
  }
}
