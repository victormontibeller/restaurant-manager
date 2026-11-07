import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { CatalogoApiService } from '../catalogo/catalogo-api.service';
import { mensagemErro } from '../catalogo/modelos';
import { ContextoCarrinho, ItemCarrinho, LinhaCarrinho, ResumoCarrinho } from './modelos';

@Injectable({ providedIn: 'root' })
export class CarrinhoService {
  private readonly api = inject(CatalogoApiService);
  private geracao = 0;
  private consultadoEm = 0;
  private requisicao: AbortController | null = null;
  readonly contexto = signal<ContextoCarrinho | null>(null);
  readonly itens = signal<ItemCarrinho[]>([]);
  readonly resumo = signal<ResumoCarrinho | null>(null);
  readonly confirmado = signal(false);
  readonly ocupado = signal(false);
  readonly online = signal(navigator.onLine);
  readonly erro = signal('');
  readonly aviso = signal('');

  constructor() {
    const rede = () => {
      this.online.set(navigator.onLine);
      this.invalidar(
        navigator.onLine
          ? 'Conexão restabelecida. Confira os itens e recalcule o resumo.'
          : 'Sem conexão. O resumo foi invalidado; nenhum pedido foi criado.',
      );
    };
    const timer = setInterval(() => {
      if (this.resumo() && Date.now() - this.consultadoEm >= 60000)
        this.invalidar(
          'A consulta expirou. Recalcule para conferir preço e disponibilidade atuais.',
        );
    }, 1000);
    window.addEventListener('online', rede);
    window.addEventListener('offline', rede);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(timer);
      window.removeEventListener('online', rede);
      window.removeEventListener('offline', rede);
      this.requisicao?.abort();
    });
  }

  definirContexto(contexto: ContextoCarrinho): void {
    const anterior = this.contexto();
    if (anterior?.unidadeId === contexto.unidadeId && anterior.canal === contexto.canal) return;
    this.itens.set([]);
    this.contexto.set(contexto);
    this.invalidar('Unidade e canal selecionados.');
  }

  guardar(linha: LinhaCarrinho, nome: string): boolean {
    if (!this.contexto() || !this.online()) {
      this.erro.set(
        'Selecione uma unidade e conecte-se ao servidor antes de configurar o carrinho.',
      );
      return false;
    }
    const existe = this.itens().some((item) => item.linha.id === linha.id);
    if (!existe && this.itens().length >= 50) {
      this.erro.set('O carrinho aceita até 50 configurações. Remova uma antes de adicionar outra.');
      return false;
    }
    const novo = { linha: structuredClone(linha), nome };
    this.itens.update((itens) =>
      existe ? itens.map((item) => (item.linha.id === linha.id ? novo : item)) : [...itens, novo],
    );
    this.invalidar(
      'Composição atualizada. Calcule o resumo para consultar os valores no servidor.',
    );
    return true;
  }

  alterarQuantidade(id: string, quantidade: number): void {
    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 99) {
      this.erro.set('Informe uma quantidade inteira entre 1 e 99.');
      return;
    }
    this.itens.update((itens) =>
      itens.map((item) =>
        item.linha.id === id ? { ...item, linha: { ...item.linha, quantidade } } : item,
      ),
    );
    this.invalidar('Quantidade alterada. Recalcule o resumo.');
  }

  remover(id: string): void {
    this.itens.update((itens) => itens.filter((item) => item.linha.id !== id));
    this.invalidar('Item removido. Recalcule os itens restantes.');
  }

  async calcular(confirmar = false): Promise<void> {
    const contexto = this.contexto();
    const anterior = this.resumo();
    if (!contexto || !this.itens().length || this.ocupado() || !this.online()) return;
    if (confirmar && !anterior) return;
    const geracao = ++this.geracao;
    const controlador = new AbortController();
    this.requisicao?.abort();
    this.requisicao = controlador;
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.confirmado.set(false);
    try {
      const resumo = await this.api.enviar<ResumoCarrinho>(
        '/api/v1/carrinho/calcular',
        'POST',
        {
          unidadeId: contexto.unidadeId,
          canal: contexto.canal,
          linhas: this.itens().map((item) => item.linha),
          revisaoAnterior: confirmar ? anterior!.revisao : null,
        },
        controlador.signal,
      );
      if (geracao !== this.geracao) return;
      this.resumo.set(resumo);
      this.consultadoEm = Date.now();
      this.confirmado.set(confirmar && !resumo.requerConfirmacao);
      this.aviso.set(
        this.confirmado()
          ? 'Composição e valores conferidos no servidor. Este resumo não é um pedido nem reserva produtos.'
          : confirmar
            ? 'O catálogo mudou. Revise os valores atualizados e confirme novamente.'
            : 'Revise a composição e os valores retornados pelo servidor antes de confirmar o resumo.',
      );
    } catch (error) {
      if (geracao !== this.geracao) return;
      this.resumo.set(null);
      this.erro.set(mensagemErro(error));
      this.aviso.set(
        'Os itens foram preservados. Edite as escolhas indisponíveis; nenhuma substituição foi feita.',
      );
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }

  private invalidar(aviso: string): void {
    this.geracao++;
    this.requisicao?.abort();
    this.requisicao = null;
    this.ocupado.set(false);
    this.resumo.set(null);
    this.confirmado.set(false);
    this.erro.set('');
    this.aviso.set(aviso);
  }
}
