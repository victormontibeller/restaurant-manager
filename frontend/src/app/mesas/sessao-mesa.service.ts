import { Injectable, signal } from '@angular/core';
import { ApiFailure } from '../identidade/sessao.service';
import { ParticipanteAtual } from './modelos';

@Injectable({ providedIn: 'root' })
export class SessaoMesaService {
  readonly participante = signal<ParticipanteAtual | null>(null);
  readonly encerramentoPendente = signal(false);
  private access: string | null = null;
  private geracao = 0;
  private renovacao: Promise<void> | null = null;
  private inicializacao: Promise<void> | null = null;
  private timer?: ReturnType<typeof setTimeout>;
  private readonly canal = new BroadcastChannel('rm-sessao-mesa');

  constructor() {
    this.canal.onmessage = (event) => {
      if (event.data === 'saiu') {
        this.encerramentoPendente.set(false);
        this.limpar();
      }
    };
    window.addEventListener('beforeunload', (event) => {
      if (this.encerramentoPendente()) {
        event.preventDefault();
        event.returnValue = '';
      }
    });
  }

  async autorizar(mesaId: string, codigo: string): Promise<void> {
    if (this.encerramentoPendente())
      throw new Error('Confirme o encerramento anterior antes de autorizar outra participação.');
    await navigator.locks.request('rm-sessao-mesa', async () => {
      const geracao = this.geracao;
      const response = await this.comando('autorizar', { mesaId, codigo });
      await this.receber(response, geracao);
    });
  }

  inicializar(): Promise<void> {
    if (!this.inicializacao) {
      this.inicializacao = this.restaurar().catch((error) => {
        this.inicializacao = null;
        throw error;
      });
    }
    return this.inicializacao;
  }

  async restaurar(): Promise<void> {
    if (this.encerramentoPendente()) return;
    if (!this.renovacao) {
      this.renovacao = navigator.locks
        .request('rm-sessao-mesa', async () => {
          const geracao = this.geracao;
          const response = await this.comando('refresh');
          if (geracao !== this.geracao) return;
          if (response.status === 401) {
            this.limpar();
            return;
          }
          await this.receber(response, geracao);
        })
        .finally(() => {
          this.renovacao = null;
        });
    }
    return this.renovacao;
  }

  async sair(): Promise<void> {
    try {
      const response = await navigator.locks.request('rm-sessao-mesa', () =>
        this.comando('logout'),
      );
      if (!response.ok && response.status !== 401) throw await this.erro(response);
      this.encerramentoPendente.set(false);
      this.canal.postMessage('saiu');
    } catch (error) {
      this.encerramentoPendente.set(true);
      throw error;
    } finally {
      this.limpar();
    }
  }

  async api<T = void>(path: string, method = 'GET', body?: object): Promise<T> {
    const geracao = this.geracao;
    const response = await this.requisicao(path, {
      method,
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const resultado = response.status === 204 ? (undefined as T) : ((await response.json()) as T);
    if (geracao !== this.geracao)
      throw new Error('Resposta de atendimento anterior descartada. Consulte a intenção original.');
    return resultado;
  }

  async abrirFluxo(path: string, signal: AbortSignal): Promise<Response> {
    return this.requisicao(path, { signal, headers: { Accept: 'text/event-stream' } });
  }

  private async requisicao(path: string, init: RequestInit): Promise<Response> {
    if (!path.startsWith('/api/v1/mesa/')) throw new Error('Contexto de mesa inválido.');
    const access = this.access;
    const geracao = this.geracao;
    if (!access) throw new ApiFailure(401, 'Autorize sua participação na mesa novamente.');
    const response = await fetch(path, {
      ...init,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { ...init.headers, Authorization: 'Bearer ' + access },
    });
    if (geracao !== this.geracao) {
      await response.body?.cancel();
      throw new Error('Resposta de atendimento anterior descartada. Consulte a intenção original.');
    }
    if (!response.ok) {
      if (response.status === 401 && access === this.access) this.limpar();
      throw await this.erro(response);
    }
    return response;
  }

  private async receber(response: Response, geracao: number): Promise<void> {
    if (geracao !== this.geracao) throw new Error('Autorização anterior descartada.');
    if (!response.ok) throw await this.erro(response);
    const tokens = (await response.json()) as { accessToken: string; expiresIn: number };
    if (geracao !== this.geracao) throw new Error('Autorização anterior descartada.');
    const atual = await fetch('/api/v1/mesa/sessao', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: { Authorization: 'Bearer ' + tokens.accessToken },
    });
    if (geracao !== this.geracao) {
      await atual.body?.cancel();
      throw new Error('Autorização anterior descartada.');
    }
    if (!atual.ok) throw await this.erro(atual);
    const participante = (await atual.json()) as ParticipanteAtual;
    if (geracao !== this.geracao) throw new Error('Autorização anterior descartada.');
    const anterior = this.participante();
    const mudou =
      anterior?.participanteId !== participante.participanteId ||
      anterior?.sessaoId !== participante.sessaoId;
    if (mudou) this.geracao++;
    const vigente = this.geracao;
    this.access = tokens.accessToken;
    if (mudou) this.participante.set(participante);
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        void this.restaurar().catch(() => {
          if (vigente === this.geracao) this.limpar();
        });
      },
      Math.max(1, tokens.expiresIn - 60) * 1000,
    );
  }

  private limpar(): void {
    this.geracao++;
    this.access = null;
    clearTimeout(this.timer);
    this.participante.set(null);
  }

  private async comando(acao: string, body?: object): Promise<Response> {
    const csrfResponse = await fetch('/api/v1/mesa/auth/csrf', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!csrfResponse.ok) throw new Error('Não foi possível verificar a conexão com a mesa.');
    const csrf = (await csrfResponse.json()) as { token: string; headerName: string };
    return fetch('/api/v1/mesa/auth/' + acao, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  private async erro(response: Response): Promise<ApiFailure> {
    let mensagem = 'Não foi possível confirmar o resultado. Consulte o estado antes de repetir.';
    let codigo = '';
    if (response.status < 500) {
      try {
        const body = (await response.json()) as { mensagem?: string; codigo?: string };
        if (typeof body.mensagem === 'string') mensagem = body.mensagem;
        if (typeof body.codigo === 'string') codigo = body.codigo;
      } catch {
        /* Um intermediário pode responder HTML; não mostrar detalhes técnicos. */
      }
    }
    return new ApiFailure(response.status, mensagem, codigo);
  }
}
