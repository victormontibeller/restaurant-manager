import { Injectable, signal } from '@angular/core';

export interface Identidade { usuarioId: string; perfil: string; emailVerificado: boolean; }
interface Access { accessToken: string; expiresIn: number; }
export class ApiFailure extends Error {
  constructor(readonly status:number,mensagem:string) {super(mensagem);}
}

@Injectable({ providedIn: 'root' })
export class SessaoService {
  readonly identidade = signal<Identidade | null>(null);
  private access: string | null = null;
  private renewal: Promise<void> | null = null;
  private renewalTimer?: ReturnType<typeof setTimeout>;
  private channel = new BroadcastChannel('rm-sessao');
  constructor() { this.channel.onmessage = event => { if (event.data === 'saiu') this.limpar(); }; }

  async restaurar(): Promise<void> {
    if (!this.renewal) this.renewal = navigator.locks.request('rm-sessao', () => this.restaurarInterno()).finally(() => { this.renewal = null; });
    return this.renewal;
  }
  private async restaurarInterno(): Promise<void> {
    const response = await this.comando('refresh');
    if (response.status === 401) { this.limpar(); return; }
    await this.receber(response);
  }
  async entrar(email: string, senha: string): Promise<void> {
    await navigator.locks.request('rm-sessao', async () => this.receber(await this.comando('login', {email, senha})));
  }
  async sair(): Promise<void> {
    try {
      const response = await navigator.locks.request('rm-sessao', () => this.comando('logout'));
      if (!response.ok && response.status !== 401) throw new Error('Não foi possível encerrar a sessão no servidor. Tente novamente.');
      this.channel.postMessage('saiu');
    } finally { this.limpar(); }
  }
  async api<T = void>(path: string, method = 'GET', body?: object): Promise<T> {
    if (!this.access) throw new Error('Entre novamente para continuar.');
    let response: Response;
    try {
      response = await fetch(path, {method,credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000),
        headers:{Authorization:'Bearer '+this.access,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    } catch { throw new Error('Conexão interrompida. Recarregue para conferir o resultado antes de tentar novamente.'); }
    if (!response.ok) {
      if (response.status===401) this.limpar();
      const error=await response.json() as {mensagem?:string};
      throw new ApiFailure(response.status,error.mensagem??'Não foi possível concluir a operação.');
    }
    return response.status===204?undefined as T:await response.json() as T;
  }
  async atualizarIdentidade(): Promise<void> { this.identidade.set(await this.api<Identidade>('/api/v1/auth/me')); }
  private limpar(): void { clearTimeout(this.renewalTimer); this.access = null; this.identidade.set(null); }
  private async receber(response: Response): Promise<void> {
    if (!response.ok) {
      const error: {mensagem?:string} = await response.json();
      throw new Error(error.mensagem ?? 'Não foi possível acessar a conta.');
    }
    const tokens = await response.json() as Access;
    this.access = tokens.accessToken;
    const me = await fetch('/api/v1/auth/me', {credentials:'same-origin',cache:'no-store',headers:{Authorization:`Bearer ${this.access}`},signal:AbortSignal.timeout(10000)});
    if (!me.ok) { this.limpar(); throw new Error('Sua sessão foi encerrada. Entre novamente.'); }
    this.identidade.set(await me.json() as Identidade);
    clearTimeout(this.renewalTimer);
    this.renewalTimer = setTimeout(() => { void this.restaurar().catch(() => this.limpar()); }, Math.max(1,tokens.expiresIn-60)*1000);
  }
  private async comando(action: string, body?: object): Promise<Response> {
    const csrfResponse = await fetch('/api/v1/auth/csrf', {credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
    if (!csrfResponse.ok) throw new Error('Empresa indisponível ou conexão interrompida.');
    const csrf = await csrfResponse.json() as {token:string; headerName:string};
    return fetch(`/api/v1/auth/${action}`, {method:'POST',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000),
      headers:{'Content-Type':'application/json',[csrf.headerName]:csrf.token},body:body?JSON.stringify(body):undefined});
  }
}
