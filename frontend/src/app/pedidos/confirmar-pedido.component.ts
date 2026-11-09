import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { ROUTES, RouterLink } from '@angular/router';
import { CarrinhoService } from '../carrinho/carrinho.service';
import { mensagemErro } from '../catalogo/modelos';
import { SessaoService } from '../identidade/sessao.service';
import { Mesa } from '../mesas/modelos';
import { SessaoMesaService } from '../mesas/sessao-mesa.service';
import { HlmButton } from '../ui/button';
import { PedidoEnvioService } from './pedido-envio.service';
import { AcessosOperacao, EnvioPedido, Pedido, nomeEstado } from './modelos';

@Component({
  selector: 'app-confirmar-pedido',
  imports: [RouterLink, HlmButton],
  templateUrl: './confirmar-pedido.component.html',
  styleUrl: '../operacao.css',
})
export class ConfirmarPedidoComponent {
  readonly carrinho = inject(CarrinhoService);
  readonly sessao = inject(SessaoService);
  readonly sessaoMesa = inject(SessaoMesaService);
  readonly envio = inject(PedidoEnvioService);
  readonly navegacaoDisponivel = inject(ROUTES, { optional: true }) !== null;
  readonly mesas = signal<Mesa[]>([]);
  readonly paginaMesas = signal(0);
  readonly maisMesas = signal(false);
  readonly carregandoMesas = signal(false);
  readonly erro = signal('');
  readonly confirmado = signal<Pedido | null>(null);
  readonly podeReenviar = signal(false);
  readonly acoes = signal<string[]>([]);
  readonly nomeEstado = nomeEstado;
  get observacao(): string {
    return this.rascunho().observacao;
  }
  set observacao(valor: string) {
    this.rascunho().observacao = valor;
  }
  get comandaId(): string {
    return this.rascunho().comandaId;
  }
  set comandaId(valor: string) {
    this.rascunho().comandaId = valor;
  }

  private rascunho() {
    const contexto = this.carrinho.contexto();
    return this.envio.rascunho(this.tipoMesa(), contexto?.unidadeId ?? '', contexto?.canal ?? '');
  }
  private consulta = 0;
  private consultaMesas = 0;
  private carregamentoMesas: Promise<void> | null = null;

  constructor() {
    effect(() => {
      const contexto = this.carrinho.contexto();
      const identidade = this.sessao.identidade();
      const participante = this.sessaoMesa.participante();
      this.confirmado.set(null);
      this.mesas.set([]);
      this.paginaMesas.set(this.rascunho().paginaMesas);
      this.maisMesas.set(false);
      this.carregandoMesas.set(false);
      this.carregamentoMesas = null;
      this.consultaMesas++;
      this.acoes.set([]);
      const consulta = ++this.consulta;
      if (identidade && identidade.perfil !== 'CLIENTE' && !participante) {
        void this.sessao
          .api<AcessosOperacao>('/api/v1/acessos/efetivos')
          .then(async (acessos) => {
            if (consulta !== this.consulta) return;
            this.acoes.set(acessos.acoes);
            if (contexto?.canal === 'MESA' && acessos.acoes.includes('pedido.criar_assistido')) {
              await this.carregarMesas(this.rascunho().paginaMesas);
            }
          })
          .catch((error) => {
            if (consulta === this.consulta) this.erro.set(mensagemErro(error));
          });
      }
    });
    inject(DestroyRef).onDestroy(() => {
      this.consulta++;
      this.consultaMesas++;
    });
  }

  async carregarMesas(pagina: number): Promise<void> {
    const contexto = this.carrinho.contexto();
    const geracao = this.consulta;
    if (
      pagina < 0 ||
      this.envio.ocupado() ||
      this.envio.pendente(this.tipoMesa()) ||
      contexto?.canal !== 'MESA' ||
      !this.acoes().includes('pedido.criar_assistido')
    )
      return;
    while (this.carregamentoMesas) {
      await this.carregamentoMesas.catch(() => undefined);
      if (geracao !== this.consulta) return;
    }
    if (this.envio.ocupado() || this.envio.pendente(this.tipoMesa())) return;
    const carregamento = this.consultarMesas(contexto.unidadeId, pagina);
    this.carregamentoMesas = carregamento;
    try {
      await carregamento;
    } finally {
      if (this.carregamentoMesas === carregamento) this.carregamentoMesas = null;
    }
  }

  private async consultarMesas(unidadeId: string, pagina: number): Promise<void> {
    const consulta = ++this.consultaMesas;
    this.carregandoMesas.set(true);
    try {
      const mesas = await this.sessao.api<Mesa[]>(
        '/api/v1/operacao/mesas?unidadeId=' + unidadeId + '&pagina=' + pagina,
      );
      if (consulta !== this.consultaMesas) return;
      const abertas = mesas.filter((mesa) => mesa.estadoComanda === 'ABERTA');
      this.mesas.set(abertas);
      this.paginaMesas.set(pagina);
      this.rascunho().paginaMesas = pagina;
      this.maisMesas.set(mesas.length === 50);
      if (!abertas.some((mesa) => mesa.comandaId === this.comandaId)) this.comandaId = '';
      this.erro.set('');
    } catch (error) {
      if (consulta === this.consultaMesas) this.erro.set(mensagemErro(error));
    } finally {
      if (consulta === this.consultaMesas) this.carregandoMesas.set(false);
    }
  }

  tipoMesa(): boolean {
    return this.carrinho.contexto()?.canal === 'MESA' && !!this.sessaoMesa.participante();
  }

  assistido(): boolean {
    const pessoa = this.sessao.identidade();
    return !this.tipoMesa() && !!pessoa && pessoa.perfil !== 'CLIENTE';
  }

  podeEnviar(): boolean {
    if (
      !this.carrinho.confirmado() ||
      !this.carrinho.resumo() ||
      !this.carrinho.online() ||
      this.envio.ocupado()
    )
      return false;
    const contexto = this.carrinho.contexto();
    if (contexto?.canal === 'MESA') {
      return this.tipoMesa()
        ? this.sessaoMesa.participante()?.unidadeId === contexto.unidadeId
        : this.assistido() &&
            this.acoes().includes('pedido.criar_assistido') &&
            !this.carregandoMesas() &&
            this.mesas().some((mesa) => mesa.comandaId === this.comandaId);
    }
    return (
      this.sessao.identidade()?.perfil === 'CLIENTE' ||
      (this.assistido() && this.acoes().includes('pedido.criar_assistido'))
    );
  }

  async enviar(): Promise<void> {
    if (!this.podeEnviar()) return;
    const resumo = this.carrinho.resumo()!;
    const corpo: EnvioPedido = {
      intencaoId: crypto.randomUUID(),
      unidadeId: resumo.unidadeId,
      canal: resumo.canal,
      comandaId:
        resumo.canal === 'MESA'
          ? (this.sessaoMesa.participante()?.comandaId ?? this.comandaId)
          : null,
      revisao: resumo.revisao,
      linhas: structuredClone(this.carrinho.itens().map((item) => item.linha)),
      observacao: this.observacao.trim(),
      endereco:
        resumo.canal === 'DELIVERY'
          ? {
              logradouro: 'Rua de teste',
              numero: '100',
              complemento: 'Cenário controlado',
              bairro: 'Bairro fictício',
              cidade: 'Cidade fictícia',
              uf: 'SP',
              cep: '01001000',
            }
          : null,
    };
    await this.executar(corpo);
  }

  async reenviar(): Promise<void> {
    const pendente = this.envio.pendente(this.tipoMesa());
    if (pendente && this.podeReenviar()) await this.executar(pendente.corpo);
  }

  async reconciliar(): Promise<void> {
    this.erro.set('');
    try {
      const pendente = this.envio.pendente(this.tipoMesa());
      const pedido = await this.envio.reconciliar(this.tipoMesa());
      if (pedido) this.concluir(pedido, pendente?.corpo.revisao ?? '');
      else {
        this.podeReenviar.set(true);
        this.erro.set('Pedido ainda não encontrado. Reenvie somente a mesma intenção.');
      }
    } catch (error) {
      this.erro.set(mensagemErro(error));
    }
  }

  private async executar(corpo: EnvioPedido): Promise<void> {
    this.erro.set('');
    this.podeReenviar.set(false);
    try {
      this.concluir(await this.envio.enviar(corpo, this.tipoMesa()), corpo.revisao);
    } catch (error) {
      this.erro.set(mensagemErro(error));
    }
  }

  private concluir(pedido: Pedido, revisao: string): void {
    this.confirmado.set(pedido);
    this.podeReenviar.set(false);
    this.observacao = '';
    this.carrinho.concluirPedido(revisao);
  }
}
