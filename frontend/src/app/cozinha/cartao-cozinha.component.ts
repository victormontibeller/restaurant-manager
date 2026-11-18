import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ApiFailure } from '../identidade/sessao.service';
import { mensagemErro } from '../catalogo/modelos';
import { IntencaoComando, PedidoComandoService } from '../pedidos/pedido-comando.service';
import { CartaoCozinha, GrupoPainel, decorrido, elegiveis } from './modelos';

interface SessaoArrastoCartao {
  pointerId: number;
  inicioX: number;
  inicioY: number;
  deslocamentoX: number;
  deslocamentoY: number;
  largura: number;
  iniciado: boolean;
  fantasma: HTMLElement | null;
  mover: (ev: PointerEvent) => void;
  soltar: (ev: PointerEvent) => void;
  cancelar: () => void;
  tecla: (ev: KeyboardEvent) => void;
}

@Component({
  selector: 'app-cartao-cozinha',
  templateUrl: './cartao-cozinha.component.html',
  styleUrl: './cartao-cozinha.component.css',
})
export class CartaoCozinhaComponent {
  readonly cartao = input.required<CartaoCozinha>();
  readonly agora = input.required<number>();
  readonly fuso = input.required<string>();
  readonly online = input.required<boolean>();
  readonly acoes = input<string[]>([]);
  readonly novo = input(false);
  readonly etapa = input<GrupoPainel | ''>('');
  readonly atualizar = output<void>();
  readonly pendencia = output<string>();
  readonly pedido = computed(() => this.cartao().pedido);
  readonly comandos = inject(PedidoComandoService);
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly parcial = signal(false);
  readonly selecionadas = signal<string[]>([]);
  readonly arrastando = signal(false);
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
  readonly temDivisaoUnidades = computed(() => {
    const estados = new Set(this.pedido().unidades.map((u) => u.estado));
    return estados.size > 1 || estados.has('CANCELADO');
  });
  readonly acaoPrincipalGesto = computed<'iniciar' | 'concluir' | null>(() => {
    const grupo = this.etapa();
    const estado = this.pedido().estado;
    if (grupo === 'prontos' || grupo === 'anteriores' || estado === 'PRONTO') return null;
    if (grupo === 'fila' || estado === 'NA_FILA') {
      return this.tem('iniciar') && this.iniciar().length > 0 ? 'iniciar' : null;
    }
    if (grupo === 'emPreparo' || estado === 'EM_PREPARO') {
      if (this.tem('concluir') && this.concluir().length > 0) return 'concluir';
      if (this.tem('iniciar') && this.iniciar().length > 0) return 'iniciar';
    }
    return null;
  });
  readonly proximaEtapa = computed<'emPreparo' | 'prontos' | null>(() => {
    const acao = this.acaoPrincipalGesto();
    if (acao === 'iniciar') return 'emPreparo';
    if (acao === 'concluir') return 'prontos';
    return null;
  });
  readonly podeArrastar = computed(() => !this.bloqueado() && !!this.acaoPrincipalGesto());

  private sessaoArrasto: SessaoArrastoCartao | null = null;

  constructor() {
    effect(() => {
      const validas = new Set([...this.iniciar(), ...this.concluir()]);
      this.selecionadas.update((ids) => ids.filter((id) => validas.has(id)));
    });
    inject(DestroyRef).onDestroy(() => this.limparArrasto());
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

  iniciarArrastoCartao(evento: PointerEvent): void {
    if (!this.podeArrastar()) return;
    if (evento.button !== 0 && evento.pointerType === 'mouse') return;
    const alvo = evento.target instanceof Element ? evento.target : null;
    if (alvo?.closest('button, input, label, summary, details, select, a')) return;

    this.limparArrasto();
    const artigo =
      this.elemento.nativeElement.querySelector<HTMLElement>('.cartao') ??
      this.elemento.nativeElement;
    const retangulo = artigo.getBoundingClientRect();
    const pointerId = evento.pointerId;

    const sessao: SessaoArrastoCartao = {
      pointerId,
      inicioX: evento.clientX,
      inicioY: evento.clientY,
      deslocamentoX: evento.clientX - retangulo.left,
      deslocamentoY: evento.clientY - retangulo.top,
      largura: retangulo.width,
      iniciado: false,
      fantasma: null,
      mover: (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId || this.sessaoArrasto !== sessao) return;
        const dx = ev.clientX - sessao.inicioX;
        const dy = ev.clientY - sessao.inicioY;
        if (!sessao.iniciado) {
          if (Math.hypot(dx, dy) < 10) return;
          sessao.iniciado = true;
          this.arrastando.set(true);
          try {
            artigo.setPointerCapture?.(pointerId);
          } catch {
            /* Ignora quando o navegador não aplica captura em ponteiro sintético. */
          }
          const clone = artigo.cloneNode(true) as HTMLElement;
          clone.classList.remove('arrastando-origem');
          clone.classList.add('cartao-arrasto-fantasma');
          clone.style.position = 'fixed';
          clone.style.zIndex = '9999';
          clone.style.pointerEvents = 'none';
          clone.style.margin = '0';
          clone.style.width = `${sessao.largura}px`;
          clone.setAttribute('aria-hidden', 'true');
          document.body.appendChild(clone);
          sessao.fantasma = clone;
        }
        if (sessao.fantasma) {
          sessao.fantasma.style.left = `${ev.clientX - sessao.deslocamentoX}px`;
          sessao.fantasma.style.top = `${ev.clientY - sessao.deslocamentoY}px`;
        }
        this.destacarZonaAlvo(ev.clientX, ev.clientY);
      },
      soltar: (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId || this.sessaoArrasto !== sessao) return;
        const dx = ev.clientX - sessao.inicioX;
        const dy = ev.clientY - sessao.inicioY;
        const iniciado = sessao.iniciado;
        const etapaSolta = iniciado ? this.etapaNaPosicao(ev.clientX, ev.clientY) : null;
        this.limparArrasto();
        if (!iniciado || !this.podeArrastar()) return;

        const destinoEsperado = this.proximaEtapa();
        const acao = this.acaoPrincipalGesto();
        if (!destinoEsperado || !acao) return;

        const soltouNoDestino = etapaSolta === destinoEsperado;
        const deslizouHorizontal =
          (!etapaSolta || etapaSolta === this.etapa()) &&
          dx >= 72 &&
          Math.abs(dx) > Math.abs(dy) * 1.25;

        if (soltouNoDestino || deslizouHorizontal) {
          const usarParcial = this.parcial();
          if (usarParcial && !this.selecionadasPara(acao).length) {
            this.aviso.set('Marque ao menos uma unidade para avançar parcialmente.');
            return;
          }
          void this.comandar(acao, usarParcial);
        }
      },
      cancelar: () => this.limparArrasto(),
      tecla: (ev: KeyboardEvent) => {
        if (ev.key === 'Escape') this.limparArrasto();
      },
    };

    this.sessaoArrasto = sessao;
    window.addEventListener('pointermove', sessao.mover);
    window.addEventListener('pointerup', sessao.soltar);
    window.addEventListener('pointercancel', sessao.cancelar);
    window.addEventListener('blur', sessao.cancelar);
    document.addEventListener('keydown', sessao.tecla);
  }

  private etapaNaPosicao(clientX: number, clientY: number): string | null {
    if (typeof document === 'undefined' || !document.elementFromPoint) return null;
    const hit = document.elementFromPoint(clientX, clientY);
    const zona = hit?.closest('[data-drop-etapa]');
    return zona ? zona.getAttribute('data-drop-etapa') : null;
  }

  private destacarZonaAlvo(clientX: number, clientY: number): void {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.alvo-arrasto').forEach((el) => el.classList.remove('alvo-arrasto'));
    const destinoEsperado = this.proximaEtapa();
    if (!destinoEsperado) return;
    const hit = document.elementFromPoint?.(clientX, clientY);
    const zona = hit?.closest(`[data-drop-etapa="${destinoEsperado}"]`);
    zona?.classList.add('alvo-arrasto');
  }

  private limparArrasto(): void {
    if (typeof document !== 'undefined') {
      document
        .querySelectorAll('.alvo-arrasto')
        .forEach((el) => el.classList.remove('alvo-arrasto'));
    }
    const sessao = this.sessaoArrasto;
    this.sessaoArrasto = null;
    this.arrastando.set(false);
    if (!sessao) return;
    window.removeEventListener('pointermove', sessao.mover);
    window.removeEventListener('pointerup', sessao.soltar);
    window.removeEventListener('pointercancel', sessao.cancelar);
    window.removeEventListener('blur', sessao.cancelar);
    document.removeEventListener('keydown', sessao.tecla);
    if (sessao.fantasma?.parentNode) {
      sessao.fantasma.parentNode.removeChild(sessao.fantasma);
    }
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
