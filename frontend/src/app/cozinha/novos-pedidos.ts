import { ApiFailure } from '../identidade/sessao.service';
import { PaginaEventos } from '../eventos/acompanhamento';
import { Pedido } from '../pedidos/modelos';

/** Deduplica eventos e entradas do pedido, sem depender da página visível. */
export class NovosPedidosCozinha {
  private readonly vistos = new Set<string>();
  private readonly pedidos = new Set<string>();
  limpar(): void {
    this.vistos.clear();
    this.pedidos.clear();
  }
  async receber(
    pagina: PaginaEventos,
    consultar: (id: string) => Promise<Pedido>,
  ): Promise<string[]> {
    const candidatos = pagina.eventos.filter(
      (e) =>
        !this.vistos.has(e.id) &&
        e.pedidoId &&
        ['PEDIDO_ENVIADO', 'PEDIDO_ACEITO'].includes(e.tipo),
    );
    const novos: string[] = [];
    for (const id of [...new Set(candidatos.map((e) => e.pedidoId!))]) {
      if (this.pedidos.has(id)) continue;
      try {
        const pedido = await consultar(id);
        if (['NA_FILA', 'EM_PREPARO'].includes(pedido.estado)) novos.push(id);
      } catch (error) {
        if (!(error instanceof ApiFailure) || error.status !== 404) throw error;
      }
    }
    candidatos.forEach((e) => this.vistos.add(e.id));
    novos.forEach((id) => this.pedidos.add(id));
    return novos;
  }
}
