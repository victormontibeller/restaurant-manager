import { Injectable, inject, signal } from '@angular/core';
import { CatalogoApiService } from './catalogo-api.service';
import { CatalogoPublico, ProdutoPublico } from './modelos';

@Injectable({ providedIn: 'root' })
export class CatalogoMidiaService {
  private readonly api = inject(CatalogoApiService);
  private readonly cache = new Map<string, string | null>();
  private readonly catalogosConsultados = new Set<string>();
  private readonly produtosEmCurso = new Set<string>();
  private readonly lotesEmCurso = new Map<string, Promise<void>>();
  readonly midias = signal<Record<string, string | null>>({});

  registrar(produtos: readonly Pick<ProdutoPublico, 'id' | 'midiaId'>[]): void {
    let mudou = false;
    for (const item of produtos ?? []) {
      if (!item?.id) continue;
      const valor = item.midiaId ?? null;
      if (this.cache.get(item.id) !== valor || !this.cache.has(item.id)) {
        this.cache.set(item.id, valor);
        mudou = true;
      }
    }
    if (mudou) this.publicar();
  }

  conhecido(produtoId?: string | null): boolean {
    return !!produtoId && this.cache.has(produtoId);
  }

  midiaDoProduto(produtoId?: string | null): string | null {
    if (!produtoId) return null;
    return this.midias()[produtoId] ?? this.cache.get(produtoId) ?? null;
  }

  async garantir(
    unidadeId: string,
    canal: string,
    produtoIds: readonly (string | undefined | null)[],
  ): Promise<void> {
    if (!unidadeId || !canal || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
      return;
    }
    const faltantes = [
      ...new Set(
        produtoIds.filter(
          (id): id is string =>
            typeof id === 'string' &&
            id.length > 0 &&
            !this.cache.has(id) &&
            !this.produtosEmCurso.has(id),
        ),
      ),
    ];
    if (!faltantes.length) return;

    const chaveCatalogo = `${unidadeId}:${canal}`;
    if (!this.catalogosConsultados.has(chaveCatalogo)) {
      let lote = this.lotesEmCurso.get(chaveCatalogo);
      if (!lote) {
        lote = (async () => {
          try {
            const params = new URLSearchParams({ unidadeId, canal, pagina: '0' });
            const resultado = await this.api.consultar<CatalogoPublico>(
              '/api/v1/catalogo?' + params,
            );
            this.registrar(resultado.itens ?? []);
            this.catalogosConsultados.add(chaveCatalogo);
          } catch {
            /* Falha silenciosa: itens mantêm monograma neutro sem interromper tela. */
          } finally {
            this.lotesEmCurso.delete(chaveCatalogo);
          }
        })();
        this.lotesEmCurso.set(chaveCatalogo, lote);
      }
      await lote;
    }

    const aindaFaltantes = faltantes.filter(
      (id) => !this.cache.has(id) && !this.produtosEmCurso.has(id),
    );
    if (!aindaFaltantes.length) return;

    for (const id of aindaFaltantes) this.produtosEmCurso.add(id);
    try {
      const queries = new URLSearchParams({ unidadeId, canal }).toString();
      const resultados = await Promise.allSettled(
        aindaFaltantes.map((id) =>
          this.api.consultar<ProdutoPublico>(
            '/api/v1/catalogo/' + encodeURIComponent(id) + '?' + queries,
          ),
        ),
      );
      let mudou = false;
      resultados.forEach((res, idx) => {
        const id = aindaFaltantes[idx];
        if (res.status === 'fulfilled' && res.value) {
          this.cache.set(id, res.value.midiaId ?? null);
          mudou = true;
        } else {
          this.cache.set(id, null);
        }
      });
      if (mudou) this.publicar();
    } finally {
      for (const id of aindaFaltantes) this.produtosEmCurso.delete(id);
    }
  }

  private publicar(): void {
    const mapa: Record<string, string | null> = {};
    for (const [id, midia] of this.cache.entries()) mapa[id] = midia;
    this.midias.set(mapa);
  }
}
