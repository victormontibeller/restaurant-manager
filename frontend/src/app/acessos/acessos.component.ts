import {
  Component,
  ChangeDetectorRef,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { NavegacaoProtegidaService } from '../rotas/navegacao-protegida.service';
import { restaurarFoco } from '../ui/foco-gestao';
import { PERFIS_OPERACIONAIS } from './perfis';

interface Acao {
  codigo: string;
  descricao: string;
  escopo: 'EMPRESA' | 'UNIDADE';
  dependencia: string | null;
}

type Permissoes = Record<string, string[]>;

interface Matriz {
  versao: number;
  acoes: Acao[];
  perfis: Permissoes;
}

const AREAS = [
  {
    nome: 'Dia a dia',
    modulos: [
      { nome: 'Pedidos', prefixos: ['pedido'] },
      { nome: 'Mesas e comandas', prefixos: ['mesa', 'comanda', 'pedido.servir'] },
      { nome: 'Cozinha', prefixos: ['cozinha'] },
      {
        nome: 'Expedição',
        prefixos: ['entrega', 'pedido.retirar', 'pedido.despachar', 'pedido.entregar'],
      },
      { nome: 'Cardápio', prefixos: ['catalogo'] },
    ],
  },
  {
    nome: 'Financeiro',
    modulos: [
      { nome: 'Recebimentos e devoluções', prefixos: ['recebimento', 'financeiro', 'devolucao'] },
      { nome: 'Pendências e notificações', prefixos: ['pagamento'] },
      { nome: 'Vendas e movimentos', prefixos: ['relatorio'] },
    ],
  },
  {
    nome: 'Administração',
    modulos: [
      { nome: 'Atualizações', prefixos: ['unidade'] },
      { nome: 'Auditoria', prefixos: ['auditoria'] },
      { nome: 'Demais ações', prefixos: [] },
    ],
  },
];

const MODULOS = AREAS.flatMap((area) => area.modulos);

function normalizarBusca(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim();
}

@Component({
  selector: 'app-acessos',
  templateUrl: './acessos.component.html',
  styleUrls: ['../ui/administracao.css', './acessos.component.css'],
})
export class AcessosComponent implements OnInit {
  private readonly sessao = inject(SessaoService);
  private readonly detector = inject(ChangeDetectorRef);
  private readonly navegacao = inject(NavegacaoProtegidaService);
  private readonly chave = 'matriz-' + crypto.randomUUID();
  private origem?: HTMLElement;

  readonly perfis = PERFIS_OPERACIONAIS;
  readonly matriz = signal<Matriz | null>(null);
  readonly rascunho = signal<Permissoes>({});
  readonly busca = signal('');
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly senhaInvalida = signal(false);
  readonly conflito = signal(false);
  readonly celula = signal<{
    modulo: string;
    perfil: string;
    nomePerfil: string;
    acoes: Acao[];
  } | null>(null);

  readonly alterada = computed(() => {
    const original = this.matriz()?.perfis;
    const rascunho = this.rascunho();
    return (
      !!original &&
      this.perfis.some(({ codigo }) => {
        const antes = original[codigo];
        const depois = rascunho[codigo];
        return antes.length !== depois.length || depois.some((acao) => !antes.includes(acao));
      })
    );
  });

  readonly areas = computed(() => {
    const busca = normalizarBusca(this.busca());
    const porModulo = new Map<string, Acao[]>();
    for (const acao of this.matriz()?.acoes ?? []) {
      const prefixo = acao.codigo.split('.')[0];
      const modulo =
        MODULOS.find((m) => m.prefixos.includes(acao.codigo)) ??
        MODULOS.find((m) => m.prefixos.includes(prefixo));
      const nome = modulo?.nome ?? 'Demais ações';
      if (!porModulo.has(nome)) porModulo.set(nome, []);
      porModulo.get(nome)!.push(acao);
    }
    return AREAS.map((area) => ({
      nome: area.nome,
      modulos: area.modulos.flatMap(({ nome }) => {
        const acoes = porModulo.get(nome);
        if (!acoes) return [];
        const termos = [area.nome, nome, ...acoes.flatMap((acao) => [acao.descricao, acao.codigo])];
        return normalizarBusca(termos.join(' ')).includes(busca) ? [{ nome, acoes }] : [];
      }),
    })).filter((area) => area.modulos.length);
  });

  private readonly catalogo = computed(
    () => new Map(this.matriz()?.acoes.map((acao) => [acao.codigo, acao])),
  );

  @ViewChild('editor', { static: true }) editor!: ElementRef<HTMLDialogElement>;
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('campoBusca') campoBusca?: ElementRef<HTMLInputElement>;

  constructor() {
    this.navegacao.registrarRascunho(this.chave, this.alterada);
    inject(DestroyRef).onDestroy(() => {
      this.navegacao.retirarRascunho(this.chave);
      this.navegacao.liberar(this.chave);
    });
  }

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    if (this.ocupado()) return;
    if (this.alterada() && !window.confirm('Descartar as alterações e recarregar a matriz?'))
      return;
    await this.executar(async () => {
      this.preencher(await this.sessao.api<Matriz>('/api/v1/configuracoes/acessos'));
    });
  }

  abrir(
    origem: HTMLElement,
    modulo: { nome: string; acoes: Acao[] },
    perfil: { codigo: string; nome: string },
  ): void {
    this.origem = origem;
    this.celula.set({
      modulo: modulo.nome,
      perfil: perfil.codigo,
      nomePerfil: perfil.nome,
      acoes: modulo.acoes,
    });
    this.detector.detectChanges();
    this.editor.nativeElement.showModal();
  }

  fecharEditor(): void {
    this.celula.set(null);
    restaurarFoco(this.origem, this.campoBusca?.nativeElement);
    this.origem = undefined;
  }

  selecionadas(acoes: Acao[], perfil: string): Acao[] {
    return acoes.filter((acao) => this.rascunho()[perfil]?.includes(acao.codigo));
  }

  resumo(acoes: Acao[]): string {
    return acoes.map((acao) => acao.descricao).join(', ') || 'Sem acesso';
  }

  descricaoAcao(codigo: string): string {
    return this.catalogo().get(codigo)?.descricao ?? codigo;
  }

  exigida(codigo: string, perfil: string): boolean {
    return (this.rascunho()[perfil] ?? []).some(
      (selecionada) => this.catalogo().get(selecionada)?.dependencia === codigo,
    );
  }

  marcar(acao: Acao, perfil: string, ativa: boolean): void {
    if (this.ocupado()) return;
    this.rascunho.update((anterior) => {
      const novas = new Set(anterior[perfil]);
      if (ativa) {
        novas.add(acao.codigo);
        let dependencia = acao.dependencia;
        while (dependencia && !novas.has(dependencia)) {
          novas.add(dependencia);
          dependencia = this.catalogo().get(dependencia)?.dependencia ?? null;
        }
      } else if (!this.exigida(acao.codigo, perfil)) {
        novas.delete(acao.codigo);
      }
      return { ...anterior, [perfil]: [...novas] };
    });
  }

  async confirmar(evento: Event, input: HTMLInputElement): Promise<void> {
    evento.preventDefault();
    const senha = input.value;
    input.value = '';
    await this.executar(async () => {
      await this.sessao.api('/api/v1/auth/reautenticar', 'POST', { senha });
      this.aviso.set('Identidade confirmada por cinco minutos.');
    });
  }

  async salvar(): Promise<void> {
    const matriz = this.matriz();
    if (!matriz || !this.alterada() || this.conflito()) return;
    await this.executar(async () => {
      const atual = await this.sessao.api<Matriz>('/api/v1/configuracoes/acessos/matriz', 'PUT', {
        versao: matriz.versao,
        perfis: this.rascunho(),
      });
      this.preencher(atual);
      this.aviso.set('Permissões salvas no servidor.');
    });
  }

  private preencher(matriz: Matriz): void {
    this.rascunho.set(matriz.perfis);
    this.matriz.set(matriz);
    this.conflito.set(false);
  }

  private async executar(acao: () => Promise<void>): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true);
    this.navegacao.bloquear(this.chave, true);
    this.erro.set('');
    this.aviso.set('');
    this.senhaInvalida.set(false);
    try {
      await acao();
    } catch (erro) {
      if (erro instanceof ApiFailure) {
        if (erro.status === 409) this.conflito.set(true);
        this.senhaInvalida.set(erro.status === 422 && erro.codigo === 'CONFIRMACAO_INVALIDA');
      }
      this.erro.set(
        erro instanceof Error ? erro.message : 'Não foi possível concluir. Confira o resultado.',
      );
      setTimeout(() => this.alerta?.nativeElement.focus());
    } finally {
      this.ocupado.set(false);
      this.navegacao.bloquear(this.chave, false);
    }
  }
}
