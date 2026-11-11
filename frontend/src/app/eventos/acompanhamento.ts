import { signal } from '@angular/core';
import { ApiFailure } from '../identidade/sessao.service';

export interface EventoOperacional {
  id: string;
  tipo: string;
  pedidoId: string | null;
  comandaId: string | null;
  ocorridoEm?: string;
}

export interface PaginaEventos {
  eventos: EventoOperacional[];
  proximo: string;
  temMais: boolean;
}

export interface TransporteEventos {
  api<T>(path: string): Promise<T>;
  abrirFluxo(path: string, signal: AbortSignal): Promise<Response>;
}

/** Cada tela possui um acompanhamento; sair dela encerra rede, timers e replay. */
export class AcompanhamentoEventos {
  readonly estado = signal('Acompanhamento não iniciado.');
  readonly atualizadoEm = signal('');
  readonly conectado = signal(false);
  private controlador: AbortController | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private geracao = 0;
  private cursor = '-1';
  private ultimaTentativaFluxo = 0;
  private removerRede?: () => void;

  iniciar(
    transporte: TransporteEventos,
    rota: string,
    parametros: Record<string, string>,
    atualizar: () => Promise<void>,
    revogado: () => void,
    receber?: (pagina: PaginaEventos) => Promise<void>,
  ): void {
    this.encerrar();
    const geracao = this.geracao;
    if (typeof window !== 'undefined') {
      const offline = () => {
        this.controlador?.abort();
        this.conectado.set(false);
        this.estado.set(
          'Sem conexão. Os dados podem estar desatualizados. Nenhuma operação foi confirmada.',
        );
      };
      window.addEventListener('offline', offline);
      this.removerRede = () => window.removeEventListener('offline', offline);
    }
    this.cursor = '-1';
    let recuperando = true;
    this.estado.set('Recuperando o estado confirmado…');
    const consultar = async () => {
      if (geracao !== this.geracao) return;
      try {
        const query = new URLSearchParams({ ...parametros, depois: this.cursor });
        const pagina = await transporte.api<PaginaEventos>(rota + '?' + query);
        if (geracao !== this.geracao) return;
        await atualizar();
        if (geracao !== this.geracao) return;
        if (!recuperando) await receber?.(pagina);
        if (geracao !== this.geracao) return;
        if (!pagina.temMais) recuperando = false;
        this.confirmar(pagina);
        if (pagina.temMais) {
          this.timer = setTimeout(() => void consultar(), 0);
          return;
        }
        if (Date.now() - this.ultimaTentativaFluxo >= 30000) {
          this.ultimaTentativaFluxo = Date.now();
          await fluxo();
        }
      } catch (error) {
        if (geracao !== this.geracao) return;
        if (error instanceof ApiFailure && [401, 403, 404].includes(error.status)) {
          this.encerrar();
          this.estado.set('Acesso encerrado. Consulte sua sessão e permissões.');
          revogado();
          return;
        }
        this.conectado.set(false);
        this.estado.set('Sem conexão confirmada. Os dados podem estar desatualizados.');
      }
      if (geracao === this.geracao) this.timer = setTimeout(() => void consultar(), 5000);
    };
    const fluxo = async () => {
      const controlador = new AbortController();
      this.controlador = controlador;
      const query = new URLSearchParams({ ...parametros, depois: this.cursor });
      const response = await transporte.abrirFluxo(rota + '/stream?' + query, controlador.signal);
      if (geracao !== this.geracao) {
        await response.body?.cancel();
        return;
      }
      if (!response.headers.get('content-type')?.includes('text/event-stream') || !response.body)
        throw new Error('Acompanhamento contínuo indisponível.');
      this.estado.set('Acompanhamento em tempo real conectado.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let vigia = setTimeout(() => controlador.abort(), 45000);
      try {
        while (geracao === this.geracao) {
          const chunk = await reader.read();
          if (chunk.done) break;
          clearTimeout(vigia);
          vigia = setTimeout(() => controlador.abort(), 45000);
          buffer = (buffer + decoder.decode(chunk.value, { stream: true })).replace(/\r\n/g, '\n');
          if (buffer.length > 262144) throw new Error('Resposta de acompanhamento inválida.');
          let separador: number;
          while ((separador = buffer.indexOf('\n\n')) >= 0) {
            const bloco = buffer.slice(0, separador);
            buffer = buffer.slice(separador + 2);
            const dados = bloco
              .split('\n')
              .filter((linha) => linha.startsWith('data:'))
              .map((linha) => linha.slice(5).trimStart())
              .join('\n');
            if (!dados) continue;
            const pagina = JSON.parse(dados) as PaginaEventos;
            if (geracao !== this.geracao) return;
            await atualizar();
            if (geracao !== this.geracao) return;
            if (!recuperando) await receber?.(pagina);
            if (geracao !== this.geracao) return;
            if (!pagina.temMais) recuperando = false;
            this.confirmar(pagina);
            this.estado.set('Acompanhamento em tempo real conectado.');
          }
        }
      } finally {
        clearTimeout(vigia);
        await reader.cancel().catch(() => undefined);
        reader.releaseLock();
      }
      if (geracao === this.geracao) {
        this.conectado.set(false);
        this.estado.set('Reconectando. Consultas automáticas a cada cinco segundos.');
      }
    };
    void consultar();
  }

  encerrar(): void {
    this.geracao++;
    this.controlador?.abort();
    this.controlador = null;
    this.removerRede?.();
    this.removerRede = undefined;
    clearTimeout(this.timer);
    this.conectado.set(false);
    this.atualizadoEm.set('');
    this.ultimaTentativaFluxo = 0;
  }

  private confirmar(pagina: PaginaEventos): void {
    if (
      !Array.isArray(pagina.eventos) ||
      typeof pagina.proximo !== 'string' ||
      pagina.proximo.length > 2000
    )
      throw new Error('Resposta de acompanhamento inválida.');
    this.cursor = pagina.proximo;
    this.conectado.set(true);
    this.atualizadoEm.set(new Date().toLocaleTimeString('pt-BR'));
    this.estado.set('Estado confirmado. Acompanhamento automático ativo.');
  }
}
