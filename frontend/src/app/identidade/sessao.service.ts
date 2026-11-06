import { Injectable, signal } from '@angular/core';

export interface Identidade {
  usuarioId: string;
  perfil: string;
  emailVerificado: boolean;
}

interface Access {
  accessToken: string;
  expiresIn: number;
}

export class ApiFailure extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
    readonly codigo = '',
  ) {
    super(mensagem);
  }
}

@Injectable({ providedIn: 'root' })
export class SessaoService {
  readonly identidade = signal<Identidade | null>(null);
  private access: string | null = null;
  private geracao = 0;
  private renewal: Promise<void> | null = null;
  private renewalTimer?: ReturnType<typeof setTimeout>;
  private channel = new BroadcastChannel('rm-sessao');

  constructor() {
    this.channel.onmessage = (event) => {
      if (event.data === 'saiu') this.limpar();
    };
  }

  async restaurar(): Promise<void> {
    if (!this.renewal)
      this.renewal = navigator.locks
        .request('rm-sessao', () => this.restaurarInterno())
        .finally(() => {
          this.renewal = null;
        });
    return this.renewal;
  }

  private async restaurarInterno(): Promise<void> {
    const geracao = this.geracao;
    const response = await this.comando('refresh');
    if (geracao !== this.geracao) throw new Error('Restauração de sessão anterior descartada.');
    if (response.status === 401) {
      this.limpar();
      return;
    }
    await this.receber(response, geracao);
  }

  async entrar(email: string, senha: string): Promise<void> {
    await navigator.locks.request('rm-sessao', async () => {
      const geracao = this.geracao;
      await this.receber(await this.comando('login', { email, senha }), geracao);
    });
  }

  async sair(): Promise<void> {
    try {
      const response = await navigator.locks.request('rm-sessao', () => this.comando('logout'));
      if (!response.ok && response.status !== 401)
        throw new Error('Não foi possível encerrar a sessão no servidor. Tente novamente.');
      this.channel.postMessage('saiu');
    } finally {
      this.limpar();
    }
  }

  async api<T = void>(path: string, method = 'GET', body?: object): Promise<T> {
    if (!this.access) throw new Error('Entre novamente para continuar.');
    const geracao = this.geracao;
    let response: Response;
    const access = this.access;
    try {
      response = await fetch(path, {
        method,
        credentials: 'same-origin',
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
        headers: { Authorization: 'Bearer ' + this.access, 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new Error(
        'Conexão interrompida. Recarregue para conferir o resultado antes de tentar novamente.',
      );
    }
    if (geracao !== this.geracao) throw new Error('Resposta de sessão anterior descartada.');
    if (!response.ok) {
      if (response.status === 401 && access !== this.access)
        throw new Error(
          'Credencial renovada durante a consulta. Consulte novamente antes de repetir uma operação.',
        );
      if (response.status === 401) this.limpar();
      throw await this.erroComando(response);
    }
    const resultado = response.status === 204 ? (undefined as T) : ((await response.json()) as T);
    if (geracao !== this.geracao) throw new Error('Resposta de sessão anterior descartada.');
    return resultado;
  }

  async atualizarIdentidade(): Promise<void> {
    this.identidade.set(await this.api<Identidade>('/api/v1/auth/me'));
  }

  async aceitarConvite(body: object): Promise<void> {
    const response = await this.comando('convites/aceitar', body);
    if (!response.ok) throw await this.erroComando(response);
  }

  async cadastrar(action: 'cadastro' | 'cadastro/confirmar', body: object): Promise<void> {
    const response = await this.comando(action, body);
    if (!response.ok) throw await this.erroComando(response);
  }

  async verificarEmail(
    action: 'verificacao' | 'verificacao/confirmar',
    body: object,
  ): Promise<void> {
    const response = await this.comando(action, body);
    if (!response.ok) throw await this.erroComando(response);
  }

  async recuperar(action: 'recuperacao' | 'recuperacao/confirmar', body: object): Promise<void> {
    const response = await this.comando(action, body);
    if (!response.ok) throw await this.erroComando(response);
    if (action === 'recuperacao/confirmar') {
      this.limpar();
      this.channel.postMessage('saiu');
    }
  }

  private async erroComando(response: Response): Promise<ApiFailure> {
    let mensagem = 'Não foi possível confirmar o resultado da operação.';
    let codigo = '';
    if (response.status < 500) {
      try {
        const body = (await response.json()) as { mensagem?: unknown; codigo?: unknown };
        if (typeof body.mensagem === 'string') mensagem = body.mensagem;
        if (typeof body.codigo === 'string') codigo = body.codigo;
      } catch {
        /* Intermediário pode devolver HTML; não expor erro técnico de parsing. */
      }
    }
    return new ApiFailure(response.status, mensagem, codigo);
  }

  private limpar(): void {
    this.geracao++;
    clearTimeout(this.renewalTimer);
    this.access = null;
    this.identidade.set(null);
  }

  private async receber(response: Response, geracao = this.geracao): Promise<void> {
    if (geracao !== this.geracao) throw new Error('Resposta de sessão anterior descartada.');
    if (!response.ok) throw await this.erroComando(response);
    const tokens = (await response.json()) as Access;
    if (geracao !== this.geracao) throw new Error('Resposta de sessão anterior descartada.');
    this.access = tokens.accessToken;
    const me = await fetch('/api/v1/auth/me', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Authorization: `Bearer ${this.access}` },
      signal: AbortSignal.timeout(10000),
    });
    if (geracao !== this.geracao) throw new Error('Resposta de sessão anterior descartada.');
    if (!me.ok) {
      this.limpar();
      throw new Error('Sua sessão foi encerrada. Entre novamente.');
    }
    const identidade = (await me.json()) as Identidade;
    if (geracao !== this.geracao) throw new Error('Resposta de sessão anterior descartada.');
    this.identidade.set(identidade);
    clearTimeout(this.renewalTimer);
    this.renewalTimer = setTimeout(
      () => {
        void this.restaurar().catch(() => {
          if (geracao === this.geracao) this.limpar();
        });
      },
      Math.max(1, tokens.expiresIn - 60) * 1000,
    );
  }

  private async comando(action: string, body?: object): Promise<Response> {
    const csrfResponse = await fetch('/api/v1/auth/csrf', {
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!csrfResponse.ok) throw new Error('Empresa indisponível ou conexão interrompida.');
    const csrf = (await csrfResponse.json()) as { token: string; headerName: string };
    return fetch(`/api/v1/auth/${action}`, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', [csrf.headerName]: csrf.token },
      body: body ? JSON.stringify(body) : undefined,
    });
  }
}
