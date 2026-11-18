import { CdkDrag, CdkDragDrop, CdkDragHandle } from '@angular/cdk/drag-drop';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { ApiFailure } from '../identidade/sessao.service';
import { mensagemErro } from '../catalogo/modelos';
import { IntencaoComando, PedidoComandoService } from '../pedidos/pedido-comando.service';
import { nomeEstado } from '../pedidos/modelos';
import { GrupoPainel, CartaoCozinha, decorrido, elegiveis } from './modelos';

@Component({
  selector: 'app-cartao-cozinha',
  imports: [CdkDrag, CdkDragHandle],
  templateUrl: './cartao-cozinha.component.html',
  styleUrl: './cartao-cozinha.component.css',
})
export class CartaoCozinhaComponent {
  readonly cartao = input.required<CartaoCozinha>();
  readonly agora = input.required<number>();
  readonly fuso = input.required<string>();
  readonly online = input.required<boolean>();
  readonly acoes = input<string[]>([]);
  readonly permiteArrastar = input(false);
  readonly nomeEstado = nomeEstado;
  readonly novo = input(false);
  readonly atualizar = output<void>();
  readonly pendencia = output<string>();
  readonly pedido = computed(() => this.cartao().pedido);
  readonly comandos = inject(PedidoComandoService);
  readonly parcial = signal(false);
  readonly selecionadas = signal<string[]>([]);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly decorrido = decorrido;
  readonly iniciar = computed(() => elegiveis(this.pedido(), 'iniciar'));
  readonly concluir = computed(() => elegiveis(this.pedido(), 'concluir'));
  readonly pendente = computed(() => this.comandos.pendente(this.pedido().id, false));
  readonly bloqueado = computed(
    () => !this.online() || this.comandos.ocupado() || !!this.pendente(),
  );
  readonly cancelamento = computed(() =>
    this.pedido().solicitacoes?.some((s) => s.estado === 'PENDENTE'),
  );
  readonly referencia = computed(() => this.pedido().id.slice(0, 8).toUpperCase());

  readonly destino = computed((): GrupoPainel | null => {
    if (!this.permiteArrastar() || this.bloqueado() || this.parcial()) return null;
    if (this.pedido().estado === 'NA_FILA' && this.tem('iniciar') && this.iniciar().length)
      return 'emPreparo';
    if (
      this.pedido().estado === 'EM_PREPARO' &&
      !this.iniciar().length &&
      this.tem('concluir') &&
      this.concluir().length
    )
      return 'prontos';
    return null;
  });
  private versaoArrastada: number | null = null;

  iniciarArraste(): void {
    this.versaoArrastada = this.pedido().versao;
  }

  soltar(evento: CdkDragDrop<GrupoPainel>): void {
    const versao = this.versaoArrastada;
    this.versaoArrastada = null;
    if (!evento.isPointerOverContainer || evento.container === evento.previousContainer) return;
    if (versao !== this.pedido().versao) {
      this.aviso.set('O pedido mudou durante o arraste. Confira as quantidades antes de avançar.');
      return;
    }
    const destino = this.destino();
    if (destino && evento.container.data === destino) {
      void this.comandar(destino === 'emPreparo' ? 'iniciar' : 'concluir');
    }
  }

  constructor() {
    effect(() => {
      const validas = new Set([...this.iniciar(), ...this.concluir()]);
      this.selecionadas.update((ids) => ids.filter((id) => validas.has(id)));
    });
  }

  tem(acao: string): boolean {
    return this.acoes().includes('cozinha.' + acao);
  }
  quantidade(estado: string): number {
    return this.pedido().unidades.filter((u) => u.estado === estado).length;
  }
  horario(data: string): string {
    return new Date(data).toLocaleString('pt-BR', { timeZone: this.fuso() });
  }
  selecionar(id: string, marcado: boolean): void {
    this.selecionadas.update((ids) =>
      marcado ? [...new Set([...ids, id])] : ids.filter((v) => v !== id),
    );
  }
  selecionadasPara(acao: 'iniciar' | 'concluir'): string[] {
    const ids = new Set(elegiveis(this.pedido(), acao));
    return this.selecionadas().filter((id) => ids.has(id));
  }
  async comandar(acao: 'iniciar' | 'concluir', parcial = false): Promise<void> {
    if (this.bloqueado() || !this.tem(acao)) return;
    const unidades = parcial ? this.selecionadasPara(acao) : elegiveis(this.pedido(), acao);
    if (!unidades.length) return;
    const pedido = this.pedido();
    await this.executar({
      rota: '/api/v1/cozinha/pedidos/' + pedido.id + '/' + acao,
      corpo: { intencaoId: crypto.randomUUID(), versao: pedido.versao, motivo: '', unidades },
    });
  }
  async repetir(): Promise<void> {
    const intencao = this.pendente();
    if (intencao && this.online() && !this.comandos.ocupado()) await this.executar(intencao);
  }
  private async executar(intencao: IntencaoComando): Promise<void> {
    this.erro.set('');
    this.aviso.set('');
    try {
      await this.comandos.executar(this.pedido().id, false, intencao);
      this.selecionadas.set([]);
      this.aviso.set('Preparo confirmado pelo servidor.');
    } catch (error) {
      this.erro.set(mensagemErro(error));
      if (this.pendente()) this.pendencia.emit(this.pedido().id);
      if (error instanceof ApiFailure && error.status === 409) {
        this.selecionadas.set([]);
        this.aviso.set('O pedido mudou. Revise as quantidades após a atualização.');
      }
    } finally {
      this.atualizar.emit();
    }
  }
}
