import { Injectable } from '@angular/core';
import { ApiFailure } from '../identidade/sessao.service';

@Injectable({ providedIn: 'root' })
export class CatalogoApiService {
  async consultar<T>(path: string, signal?: AbortSignal): Promise<T> {
    return this.enviar<T>(path, 'GET', undefined, signal);
  }

  async enviar<T>(
    path: string,
    method: 'GET' | 'POST',
    body?: object,
    signal?: AbortSignal,
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(path, {
        method,
        credentials: 'omit',
        cache: 'no-store',
        signal: signal
          ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
          : AbortSignal.timeout(10000),
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      if (signal?.aborted) throw new Error('Consulta cancelada.');
      throw new Error('Sem conexão com o servidor. Conecte-se e consulte novamente.');
    }
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      const detail = error?.detail ?? error?.message ?? error?.mensagem;
      throw new ApiFailure(
        response.status,
        response.status < 500 && typeof detail === 'string' && detail.length <= 2000
          ? detail
          : 'Não foi possível consultar o catálogo. Tente novamente.',
        typeof error?.code === 'string' ? error.code : '',
      );
    }
    return (await response.json()) as T;
  }
}
