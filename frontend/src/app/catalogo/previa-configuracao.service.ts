import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import {
  ContextoCarrinho,
  LinhaCarrinho,
  ResumoCarrinho,
  SnapshotLinha,
} from '../carrinho/modelos';
import { CatalogoApiService } from './catalogo-api.service';
import { mensagemErro } from './modelos';

@Injectable()
export class PreviaConfiguracaoService {
  private readonly api = inject(CatalogoApiService);
  private geracao = 0;
  private requisicao: AbortController | null = null;
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly linha = signal<SnapshotLinha | null>(null);

  constructor() {
    const rede = () => this.invalidar();
    window.addEventListener('offline', rede);
    window.addEventListener('online', rede);
    inject(DestroyRef).onDestroy(() => {
      this.invalidar();
      window.removeEventListener('offline', rede);
      window.removeEventListener('online', rede);
    });
  }

  invalidar(): void {
    this.geracao++;
    this.requisicao?.abort();
    this.requisicao = null;
    this.ocupado.set(false);
    this.erro.set('');
    this.linha.set(null);
  }

  async calcular(contexto: ContextoCarrinho, linha: LinhaCarrinho): Promise<void> {
    this.invalidar();
    if (!navigator.onLine) {
      this.erro.set('Conecte-se para consultar o total desta configuração.');
      return;
    }
    const geracao = this.geracao;
    const controlador = new AbortController();
    this.requisicao = controlador;
    this.ocupado.set(true);
    try {
      const resumo = await this.api.enviar<ResumoCarrinho>(
        '/api/v1/carrinho/calcular',
        'POST',
        {
          unidadeId: contexto.unidadeId,
          canal: contexto.canal,
          linhas: [linha],
          revisaoAnterior: null,
        },
        controlador.signal,
      );
      if (geracao !== this.geracao) return;
      const calculada = resumo.linhas.find((item) => item.id === linha.id);
      if (!calculada)
        throw new Error('A composição calculada não foi encontrada. Consulte novamente.');
      this.linha.set(calculada);
    } catch (error) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(error));
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }
}
