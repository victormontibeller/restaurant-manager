import {
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { mensagemErro, moeda } from '../catalogo/modelos';
import { SessaoService } from '../identidade/sessao.service';
import { EnderecoPedido } from '../pedidos/modelos';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { EnderecoCliente, EntregaConfirmada, OrcamentoEntrega } from './modelos';
import { EnderecosService } from './enderecos.service';

@Component({
  selector: 'app-enderecos',
  imports: [FormsModule],
  templateUrl: './enderecos.component.html',
  styleUrl: '../operacao.css',
  styles: `form{display:grid;gap:.75rem}fieldset{min-width:0;display:grid;gap:.75rem}input,button{min-height:48px}input{width:100%}li{margin-block:.5rem}`,
})
export class EnderecosComponent {
  readonly unidadeId = input('');
  readonly subtotal = input('0.00');
  readonly bloqueado = input(false);
  readonly entrega = output<EntregaConfirmada | null>();
  private readonly sessao = inject(SessaoService);
  readonly store = inject(EnderecosService);
  private readonly navegacao = inject(NavegacaoProtegidaService);
  private readonly chave = 'enderecos:' + crypto.randomUUID();
  readonly lista = signal<EnderecoCliente[]>([]);
  readonly pagina = signal(0);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly cotacao = signal<OrcamentoEntrega | null>(null);
  readonly consultando = signal(false);
  readonly moeda = moeda;
  readonly campos: {
    chave: keyof EnderecoPedido;
    rotulo: string;
    max: number;
    autocomplete: string;
    opcional?: boolean;
  }[] = [
    {
      chave: 'destinatario',
      rotulo: 'Nome de quem recebe',
      max: 100,
      autocomplete: 'shipping name',
    },
    { chave: 'contato', rotulo: 'Telefone para contato', max: 40, autocomplete: 'shipping tel' },
    { chave: 'cep', rotulo: 'CEP', max: 9, autocomplete: 'shipping postal-code' },
    {
      chave: 'logradouro',
      rotulo: 'Rua ou avenida',
      max: 150,
      autocomplete: 'shipping address-line1',
    },
    { chave: 'numero', rotulo: 'Número', max: 20, autocomplete: 'off' },
    {
      chave: 'complemento',
      rotulo: 'Complemento',
      max: 100,
      autocomplete: 'shipping address-line2',
      opcional: true,
    },
    { chave: 'bairro', rotulo: 'Bairro', max: 100, autocomplete: 'shipping address-line3' },
    { chave: 'cidade', rotulo: 'Cidade', max: 100, autocomplete: 'shipping address-level2' },
    { chave: 'uf', rotulo: 'UF', max: 2, autocomplete: 'shipping address-level1' },
  ];
  endereco = this.vazio();
  descricao = '';
  id: string = crypto.randomUUID();
  versao = 0;
  private geracao = 0;
  private geracaoCotacao = 0;
  private conta = '';

  constructor() {
    effect(() => {
      const conta = this.sessao.identidade()?.usuarioId ?? '';
      if (conta !== this.conta) {
        this.conta = conta;
        this.novo();
        this.lista.set([]);
      }
      this.unidadeId();
      this.subtotal();
      this.geracao++;
      this.cotacao.set(null);
      this.entrega.emit(null);
      untracked(() => {
        void this.carregar(0);
      });
    });
    effect(() =>
      this.navegacao.bloquear(this.chave, this.store.ocupado() || !!this.store.pendente()),
    );
    inject(DestroyRef).onDestroy(() => {
      this.geracao++;
      this.navegacao.liberar(this.chave);
    });
  }
  private vazio(): EnderecoPedido {
    return {
      destinatario: '',
      contato: '',
      cep: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      uf: '',
    };
  }
  private normalizado(): EnderecoPedido {
    return {
      ...this.endereco,
      cep: this.endereco.cep.replace(/\D/g, ''),
      uf: this.endereco.uf.toUpperCase(),
    };
  }
  cliente(): boolean {
    return this.sessao.identidade()?.perfil === 'CLIENTE';
  }
  alterar(): void {
    this.geracaoCotacao++;
    this.cotacao.set(null);
    this.entrega.emit(null);
  }
  novo(): void {
    this.endereco = this.vazio();
    this.descricao = '';
    this.id = crypto.randomUUID();
    this.versao = 0;
    this.alterar();
  }
  usar(e: EnderecoCliente): void {
    if (this.store.pendente()) return;
    this.endereco = structuredClone(e.endereco);
    this.descricao = e.descricao;
    this.id = e.id;
    this.versao = e.versao;
    this.alterar();
  }
  async carregar(pagina: number): Promise<void> {
    if (!this.cliente()) {
      this.lista.set([]);
      this.consultando.set(false);
      return;
    }
    if (pagina < 0 || this.store.ocupado()) return;
    const geracao = this.geracao;
    this.consultando.set(true);
    try {
      const lista = await this.sessao.api<EnderecoCliente[]>(
        '/api/v1/clientes/me/enderecos?pagina=' + pagina,
      );
      if (geracao === this.geracao) {
        this.lista.set(lista);
        this.pagina.set(pagina);
      }
    } catch (erro) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(erro));
    } finally {
      if (geracao === this.geracao) this.consultando.set(false);
    }
  }
  async calcular(): Promise<void> {
    if (this.bloqueado() || this.consultando() || this.store.pendente()) return;
    const geracao = this.geracao;
    const cotacaoGeracao = this.geracaoCotacao;
    this.consultando.set(true);
    this.erro.set('');
    try {
      const endereco = this.normalizado();
      const cotacao = await this.sessao.api<OrcamentoEntrega>(
        '/api/v1/delivery/orcamento',
        'POST',
        { unidadeId: this.unidadeId(), cep: endereco.cep, subtotal: this.subtotal() },
      );
      if (geracao === this.geracao && cotacaoGeracao === this.geracaoCotacao) {
        this.cotacao.set(cotacao);
        this.entrega.emit({ endereco: structuredClone(endereco), orcamento: cotacao });
      }
    } catch (erro) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(erro));
    } finally {
      if (geracao === this.geracao) this.consultando.set(false);
    }
  }
  async salvar(entrada?: EnderecoCliente): Promise<void> {
    if (!this.cliente()) return;
    const body = entrada ?? {
      id: this.id,
      versao: this.versao,
      descricao: this.descricao || 'Meu endereço',
      endereco: this.normalizado(),
      ativo: true,
    };
    this.erro.set('');
    this.aviso.set('');
    try {
      const salvo = await this.store.salvar(body);
      this.usar(salvo);
      this.aviso.set('Endereço salvo.');
      await this.carregar(this.pagina());
    } catch (erro) {
      this.erro.set(mensagemErro(erro));
    }
  }
  async remover(e: EnderecoCliente): Promise<void> {
    if (window.confirm('Remover este endereço da sua lista?'))
      await this.salvar({ ...e, ativo: false });
  }
  async recuperar(): Promise<void> {
    const p = this.store.pendente();
    if (p) await this.salvar(p);
  }
}
