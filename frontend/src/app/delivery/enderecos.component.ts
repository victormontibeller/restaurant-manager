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
  styles: `
    :host {
      display: block;
      container-type: inline-size;
      container-name: enderecos;
    }
    .enderecos-talao {
      display: grid;
      gap: 1rem;
      color: var(--foreground, #292521);
    }
    .enderecos-topo {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: flex-end;
      gap: 0.75rem;
    }
    .enderecos-eyebrow {
      margin: 0 0 0.25rem;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--primary, #a53e2b);
    }
    .enderecos-topo h3 {
      margin: 0;
      font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
      font-size: clamp(1.25rem, 2.2vw, 1.5rem);
      font-weight: 500;
      letter-spacing: -0.02em;
      color: var(--foreground, #292521);
    }
    .enderecos-contador {
      display: inline-flex;
      align-items: center;
      padding: 0.35rem 0.75rem;
      border-radius: 999px;
      background: var(--secondary, #f0ebe3);
      border: 1px solid var(--border, #e5ded3);
      color: var(--secondary-foreground, #44372e);
      font-size: 0.78rem;
      font-weight: 700;
    }
    .enderecos-lista {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.85rem;
    }
    .endereco-talao {
      margin: 0;
      padding: 1rem 1.05rem;
      border-radius: 16px;
      border: 1px dashed var(--border, #e5ded3);
      background: var(--card, #ffffff);
      display: grid;
      gap: 0.8rem;
      box-shadow: 0 2px 0 #e5ded3;
    }
    .endereco-talao--principal {
      border-style: solid;
      border-color: #b7cbb8;
      background: #f8fbf8;
      box-shadow: 0 2px 0 #c9dac9;
    }
    .talao-topo {
      display: grid;
      gap: 0.35rem;
    }
    .talao-identidade {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.55rem;
    }
    .talao-indice {
      display: inline-grid;
      place-items: center;
      min-width: 2rem;
      height: 1.55rem;
      padding: 0 0.4rem;
      border-radius: 999px;
      background: var(--muted, #f3eee7);
      border: 1px solid var(--border, #e5ded3);
      color: var(--muted-foreground, #6e6259);
      font-size: 0.72rem;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.06em;
    }
    .talao-titulo {
      font-size: 1rem;
      font-weight: 700;
      color: var(--foreground, #292521);
    }
    .talao-badge-principal {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.65rem;
      border-radius: 999px;
      background: var(--accent, #e8efe7);
      border: 1px solid #c2d4c2;
      color: var(--accent-foreground, #30523b);
      font-size: 0.74rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }
    .talao-resumo {
      margin: 0;
      color: var(--muted-foreground, #6e6259);
      font-size: 0.9rem;
      line-height: 1.45;
      overflow-wrap: anywhere;
    }
    .talao-acoes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      padding-top: 0.65rem;
      border-top: 1px dotted var(--border, #e5ded3);
    }
    .talao-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      padding: 0.55rem 1rem;
      border-radius: 999px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--card, #ffffff);
      color: var(--foreground, #292521);
      font: inherit;
      font-size: 0.86rem;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      box-shadow: 0 2px 0 #ddd4c7;
      transition:
        background-color 140ms ease,
        transform 140ms ease;
    }
    .talao-btn:hover:not(:disabled) {
      background: var(--muted, #f3eee7);
    }
    .talao-btn:active:not(:disabled) {
      transform: translateY(1px);
    }
    .talao-btn--usar {
      background: var(--secondary, #f0ebe3);
      border-color: #d7cec1;
      color: var(--secondary-foreground, #44372e);
    }
    .talao-btn--usar:hover:not(:disabled) {
      background: #e7dfd3;
    }
    .talao-btn--principal {
      background: var(--accent, #e8efe7);
      border-color: #c2d4c2;
      color: var(--accent-foreground, #30523b);
    }
    .talao-btn--principal:hover:not(:disabled) {
      background: #dbe6da;
    }
    .talao-btn--remover {
      background: #fff8f7;
      border-color: #e8c7c1;
      color: #8f2d1f;
      box-shadow: 0 2px 0 #e6cbc6;
    }
    .talao-btn--remover:hover:not(:disabled) {
      background: #fcebe8;
    }
    .talao-btn--primario {
      background: var(--primary, #a53e2b);
      border-color: var(--primary-deep, #7f2f20);
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 3px 0 var(--primary-deep, #7f2f20);
    }
    .talao-btn--primario:hover:not(:disabled) {
      background: #933524;
    }
    .talao-btn--secundario {
      background: var(--accent-foreground, #30523b);
      border-color: #213a29;
      color: #ffffff;
      font-weight: 700;
      box-shadow: 0 3px 0 #213a29;
    }
    .talao-btn--secundario:hover:not(:disabled) {
      background: #274431;
    }
    .talao-btn:disabled {
      opacity: 1;
      background: #efe9e0;
      border-color: #d8cfc3;
      color: #594e46;
      box-shadow: none;
      cursor: not-allowed;
    }
    .enderecos-vazio {
      margin: 0;
      padding: 0.9rem 1rem;
      border-radius: 14px;
      border: 1px dashed var(--border, #e5ded3);
      background: var(--background, #faf7f2);
      color: var(--muted-foreground, #6e6259);
      font-size: 0.9rem;
    }
    .enderecos-paginacao {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.65rem;
      padding: 0.35rem 0;
    }
    .enderecos-pagina {
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--muted-foreground, #6e6259);
    }
    .endereco-form {
      display: grid;
      gap: 0.85rem;
    }
    .endereco-fieldset {
      min-width: 0;
      margin: 0;
      padding: 1.1rem;
      border-radius: 18px;
      border: 1px solid var(--border, #e5ded3);
      background: var(--background, #faf7f2);
      display: grid;
      gap: 0.9rem;
    }
    .endereco-legend {
      padding: 0 0.5rem;
      font-family: 'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif;
      font-size: 1.05rem;
      font-weight: 600;
      color: var(--foreground, #292521);
    }
    .endereco-campos-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: 0.75rem 0.85rem;
    }
    .endereco-campo {
      display: grid;
      gap: 0.35rem;
      font-size: 0.86rem;
      font-weight: 650;
      color: var(--foreground, #292521);
    }
    .endereco-campo input {
      width: 100%;
      min-height: 48px;
      border: 1px solid #d5cbbd;
      border-radius: 12px;
      padding: 0.7rem 0.9rem;
      font: inherit;
      font-weight: 500;
      background: var(--card, #ffffff);
      color: var(--foreground, #292521);
    }
    .endereco-campo input:focus-visible {
      outline: 3px solid #a53e2b45;
      border-color: var(--primary, #a53e2b);
    }
    .endereco-check {
      display: inline-flex;
      align-items: center;
      gap: 0.7rem;
      min-height: 48px;
      padding: 0.55rem 0.9rem;
      border-radius: 12px;
      border: 1px dashed #d5cbbd;
      background: var(--card, #ffffff);
      color: var(--foreground, #292521);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
    }
    .endereco-check input[type='checkbox'] {
      width: 22px;
      height: 22px;
      min-height: 22px;
      flex: none;
      margin: 0;
      accent-color: var(--primary, #a53e2b);
    }
    .endereco-form-acoes {
      display: flex;
      flex-wrap: wrap;
      gap: 0.6rem;
      padding-top: 0.35rem;
    }
    .endereco-cotacao {
      margin: 0;
      padding: 0.85rem 1rem;
      border-radius: 14px;
      border: 1px solid #c2d4c2;
      background: var(--accent, #e8efe7);
      color: var(--accent-foreground, #30523b);
      font-size: 0.9rem;
      font-weight: 600;
    }
    .endereco-recuperacao {
      display: grid;
      gap: 0.65rem;
      padding: 0.9rem 1rem;
      border-radius: 14px;
      border: 1px solid #e2c598;
      background: #fdf6e9;
      color: #6b4310;
    }
    .endereco-recuperacao .aviso {
      margin: 0;
      font-weight: 600;
    }
    .endereco-feedback {
      margin: 0;
      padding: 0.8rem 1rem;
      border-radius: 12px;
      font-size: 0.9rem;
      font-weight: 600;
    }
    .endereco-feedback--erro {
      background: #fdf1ef;
      border: 1px solid #e6bfb8;
      color: #8f2318;
    }
    .endereco-feedback--aviso {
      background: var(--accent, #e8efe7);
      border: 1px solid #c2d4c2;
      color: var(--accent-foreground, #30523b);
    }
    @container enderecos (min-width: 520px) {
      .endereco-campos-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }
      .endereco-campo--largo {
        grid-column: 1 / -1;
      }
      .endereco-campo--4 {
        grid-column: span 4;
      }
      .endereco-campo--3 {
        grid-column: span 3;
      }
      .endereco-campo--2 {
        grid-column: span 2;
      }
    }
    @media (max-width: 680px) {
      .talao-acoes,
      .endereco-form-acoes {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
      }
      .talao-btn {
        width: 100%;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .talao-btn {
        transition: none;
      }
    }
  `,
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
  principal = false;
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
    this.principal = false;
    this.alterar();
  }
  usar(e: EnderecoCliente): void {
    if (this.store.pendente()) return;
    this.endereco = structuredClone(e.endereco);
    this.descricao = e.descricao;
    this.id = e.id;
    this.versao = e.versao;
    this.principal = Boolean(e.principal);
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
      principal: this.principal,
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
  async definirPrincipal(e: EnderecoCliente): Promise<void> {
    if (this.store.ocupado() || this.store.pendente() || this.bloqueado() || this.consultando())
      return;
    await this.salvar({ ...e, ativo: true, principal: !(e.principal ?? false) });
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
