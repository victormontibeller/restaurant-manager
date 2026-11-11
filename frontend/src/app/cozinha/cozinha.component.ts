import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { mensagemErro } from '../catalogo/modelos';
import { AcompanhamentoEventos, PaginaEventos } from '../eventos/acompanhamento';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { Pedido } from '../pedidos/modelos';
import { PedidoComandoService } from '../pedidos/pedido-comando.service';
import { RM_TABS } from '../ui/tabs';
import { CartaoCozinhaComponent } from './cartao-cozinha.component';
import { NovosPedidosCozinha } from './novos-pedidos';
import { GrupoCozinha, GrupoPainel, PainelCozinha } from './modelos';

@Component({
  selector: 'app-cozinha',
  imports: [CartaoCozinhaComponent, NgTemplateOutlet, RM_TABS],
  templateUrl: './cozinha.component.html',
  styleUrl: './cozinha.component.css',
})
export class CozinhaComponent {
  readonly unidadeId = input.required<string>();
  readonly acoes = input<string[]>([]);
  private readonly sessao = inject(SessaoService);
  readonly comandos = inject(PedidoComandoService);
  readonly acompanhamento = new AcompanhamentoEventos();
  readonly painel = signal<PainelCozinha | null>(null);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly ocupado = signal(false);
  readonly canal = signal('');
  readonly aba = signal('fila');
  readonly paginas = signal<Record<GrupoPainel, number>>({
    fila: 0,
    emPreparo: 0,
    prontos: 0,
    anteriores: 0,
  });
  readonly etapas = [
    { id: 'fila' as const, nome: 'Na fila' },
    { id: 'emPreparo' as const, nome: 'Em preparo' },
    { id: 'prontos' as const, nome: 'Prontos' },
  ];
  readonly agora = signal(Date.now());
  readonly online = signal(navigator.onLine);
  readonly som = signal(false);
  readonly somOcupado = signal(false);
  readonly compacta = signal(matchMedia('(max-width: 1023px)').matches);
  readonly novos = signal<string[]>([]);
  readonly pendencias = signal<string[]>([]);
  private readonly alertas = new NovosPedidosCozinha();
  private audio?: AudioContext;
  private geracao = 0;
  private carregamento: Promise<void> | null = null;
  private encerrado = false;
  private novosTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    const media = matchMedia('(max-width: 1023px)');
    const redimensionar = () => this.compacta.set(media.matches);
    media.addEventListener('change', redimensionar);
    const rede = () => this.online.set(navigator.onLine);
    window.addEventListener('online', rede);
    window.addEventListener('offline', rede);
    const timer = setInterval(() => this.agora.set(Date.now()), 1000);
    effect(() => {
      const unidade = this.unidadeId();
      this.geracao++;
      this.carregamento = null;
      this.painel.set(null);
      this.erro.set('');
      this.novos.set([]);
      this.paginas.set({ fila: 0, emPreparo: 0, prontos: 0, anteriores: 0 });
      this.alertas.limpar();
      untracked(() =>
        this.acompanhamento.iniciar(
          this.sessao,
          '/api/v1/eventos',
          { unidadeId: unidade },
          () => this.carregar(true),
          () => {
            this.painel.set(null);
            this.geracao++;
            this.carregamento = null;
          },
          (pagina) => this.receber(pagina),
        ),
      );
    });
    inject(DestroyRef).onDestroy(() => {
      this.encerrado = true;
      this.geracao++;
      this.carregamento = null;
      media.removeEventListener('change', redimensionar);
      this.acompanhamento.encerrar();
      clearInterval(timer);
      clearTimeout(this.novosTimer);
      window.removeEventListener('online', rede);
      window.removeEventListener('offline', rede);
      void this.audio?.close();
    });
  }

  async carregar(automatica = false): Promise<void> {
    const geracao = this.geracao;
    while (this.carregamento) {
      if (!automatica) return;
      await this.carregamento.catch(() => undefined);
      if (geracao !== this.geracao) return;
    }
    const carregamento = this.consultar(automatica);
    this.carregamento = carregamento;
    try {
      await carregamento;
    } finally {
      if (this.carregamento === carregamento) this.carregamento = null;
    }
  }
  private async consultar(automatica: boolean): Promise<void> {
    const geracao = this.geracao;
    this.ocupado.set(true);
    try {
      const p = this.paginas();
      const query = new URLSearchParams({
        unidadeId: this.unidadeId(),
        paginaFila: String(p.fila),
        paginaPreparo: String(p.emPreparo),
        paginaProntos: String(p.prontos),
        paginaAnteriores: String(p.anteriores),
        ...(this.canal() ? { canal: this.canal() } : {}),
      });
      const resultado = await this.sessao.api<PainelCozinha>('/api/v1/cozinha/painel?' + query);
      if (geracao !== this.geracao) return;
      this.painel.set(resultado);
      this.erro.set('');
    } catch (error) {
      if (geracao !== this.geracao) return;
      this.erro.set(mensagemErro(error));
      if (error instanceof ApiFailure && [401, 403, 404].includes(error.status))
        this.painel.set(null);
      if (automatica) throw error;
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }

  grupo(chave: GrupoPainel): GrupoCozinha {
    return this.painel()?.[chave] ?? { itens: [], total: 0, mais: false };
  }
  totalEtapa(chave: GrupoPainel): number {
    return this.grupo(chave).total + (chave === 'prontos' ? this.grupo('anteriores').total : 0);
  }

  paginaDo(chave: GrupoPainel): number {
    return this.paginas()[chave];
  }

  filtrar(valor: string): void {
    this.canal.set(valor);
    this.geracao++;
    this.carregamento = null;
    this.painel.set(null);
    this.paginas.set({ fila: 0, emPreparo: 0, prontos: 0, anteriores: 0 });
    void this.carregar();
  }
  async navegar(grupo: GrupoPainel, pagina: number): Promise<void> {
    if (pagina < 0 || this.ocupado()) return;
    const anterior = this.paginas();
    this.paginas.set({ ...anterior, [grupo]: pagina });
    try {
      await this.carregar(true);
    } catch {
      this.paginas.set(anterior);
    }
  }
  registrarPendente(id: string): void {
    this.pendencias.update((ids) => [...new Set([...ids, id])]);
  }
  async recuperar(id: string): Promise<void> {
    const intencao = this.comandos.pendente(id, false);
    if (!intencao || !this.online() || this.comandos.ocupado()) return;
    try {
      await this.comandos.executar(id, false, intencao);
      this.aviso.set('Resultado recuperado.');
    } catch (error) {
      this.erro.set(mensagemErro(error));
    } finally {
      await this.atualizar();
    }
  }
  async atualizar(): Promise<void> {
    this.pendencias.update((ids) => ids.filter((id) => !!this.comandos.pendente(id, false)));
    await this.carregar();
  }
  async telaCheia(): Promise<void> {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      this.aviso.set('Tela cheia indisponível neste navegador.');
    }
  }
  async alternarSom(): Promise<void> {
    if (this.somOcupado()) return;
    if (this.som()) {
      this.som.set(false);
      return;
    }
    this.somOcupado.set(true);
    let limite: ReturnType<typeof setTimeout> | undefined;
    try {
      this.audio ??= new AudioContext();
      await Promise.race([
        this.audio.resume(),
        new Promise<never>((_resolve, reject) => {
          limite = setTimeout(() => reject(new Error('Áudio indisponível')), 1500);
        }),
      ]);
      if (this.encerrado) return;
      this.som.set(this.audio.state === 'running');
      this.aviso.set(
        this.som()
          ? 'Som ativado para novas entradas nesta aba.'
          : 'Áudio indisponível; os avisos visuais continuam ativos.',
      );
    } catch {
      this.som.set(false);
      this.aviso.set('Áudio indisponível; os avisos visuais continuam ativos.');
    } finally {
      clearTimeout(limite);
      this.somOcupado.set(false);
    }
  }
  private async receber(pagina: PaginaEventos): Promise<void> {
    const geracao = this.geracao;
    const ids = await this.alertas.receber(pagina, async (id) =>
      this.sessao.api<Pedido>('/api/v1/operacao/pedidos/' + id),
    );
    if (this.encerrado || geracao !== this.geracao || !ids.length) return;
    this.novos.set(ids);
    this.aviso.set(
      ids.length === 1
        ? 'Novo pedido liberado para a cozinha.'
        : ids.length + ' novos pedidos liberados para a cozinha.',
    );
    clearTimeout(this.novosTimer);
    this.novosTimer = setTimeout(() => this.novos.set([]), 30000);
    if (!this.som() || !this.audio) return;
    try {
      if (this.audio.state !== 'running') throw new Error('Áudio suspenso');
      const oscilador = this.audio.createOscillator();
      const ganho = this.audio.createGain();
      oscilador.frequency.value = 660;
      ganho.gain.value = 0.12;
      oscilador.connect(ganho);
      ganho.connect(this.audio.destination);
      oscilador.start();
      oscilador.stop(this.audio.currentTime + 0.18);
      oscilador.onended = () => {
        oscilador.disconnect();
        ganho.disconnect();
      };
    } catch {
      this.som.set(false);
      this.aviso.set('Novo pedido. Áudio indisponível; confira o painel.');
    }
  }
}
