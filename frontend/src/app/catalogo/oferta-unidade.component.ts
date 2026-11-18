import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { FormularioRotaDirective } from '../rotas/formulario-rota.directive';
import { CatalogoPendenteService } from './catalogo-pendente.service';
import { CANAIS, Canal, Oferta, Unidade, mensagemErro } from './modelos';

@Component({
  selector: 'app-oferta-unidade',
  templateUrl: './oferta-unidade.component.html',
  styleUrls: ['./catalogo.css', './catalogo-editor.css'],
})
export class OfertaUnidadeComponent implements OnChanges {
  @Input({ required: true }) produtoId = '';
  @Input() nome = '';
  @Input() unidadeInicial = '';
  @Output() ofertaConfirmada = new EventEmitter<Oferta>();
  @Input() unidades: Unidade[] = [];
  @Input() podeAlterar = false;
  @Input() bloqueado = false;
  @Output() bloqueio = new EventEmitter<boolean>();
  @Output() salvo = new EventEmitter<string>();
  @Output() fechar = new EventEmitter<void>();
  private readonly sessao = inject(SessaoService);
  private readonly pendencias = inject(CatalogoPendenteService);
  private readonly formulario = inject(FormularioRotaDirective, { optional: true });
  private destruido = false;
  private geracao = 0;
  readonly unidadeId = signal('');
  readonly oferta = signal<Oferta | null>(null);
  readonly ocupado = signal(false);
  readonly incerto = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly canais = CANAIS;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
      this.geracao++;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['produtoId']) {
      this.geracao++;
      this.unidadeId.set('');
      this.oferta.set(null);
      this.erro.set('');
      this.aviso.set('');
      this.incerto.set(false);
    }
    const pessoa = this.sessao.identidade();
    const pendente = pessoa && this.pendencias.daConta(pessoa.usuarioId)();
    if (pendente && pendente.tipo === 'oferta' && pendente.dados.produtoId === this.produtoId) {
      this.unidadeId.set(pendente.dados.unidadeId);
      this.incerto.set(true);
      this.bloqueio.emit(true);
    } else if (changes['produtoId'] && this.unidades.some((u) => u.id === this.unidadeInicial)) {
      this.unidadeId.set(this.unidadeInicial);
      queueMicrotask(() => {
        if (!this.destruido) void this.consultar();
      });
    }
  }

  async selecionarUnidade(seletor: HTMLSelectElement): Promise<void> {
    const id = seletor.value;
    if (
      this.ocupado() ||
      this.incerto() ||
      this.bloqueado ||
      this.formulario?.confirmarDescarte(this.grupoRascunho()) === false
    ) {
      seletor.value = this.unidadeId();
      return;
    }
    this.unidadeId.set(id);
    this.oferta.set(null);
    if (id) await this.consultar();
  }

  atualizar(): void {
    if (
      !this.incerto() &&
      this.formulario?.temRascunho(this.grupoRascunho()) &&
      !window.confirm('A consulta substitui as alterações ainda não salvas. Deseja continuar?')
    )
      return;
    void this.consultar();
  }

  async consultar(): Promise<void> {
    if (!this.unidadeId() || this.ocupado() || this.bloqueado) return;
    const geracao = ++this.geracao;
    this.ocupado.set(true);
    this.bloqueio.emit(true);
    this.erro.set('');
    try {
      const oferta = await this.sessao.api<Oferta>(this.rota());
      if (this.destruido || geracao !== this.geracao) return;
      this.oferta.set(oferta);
      this.incerto.set(false);
      this.limparPendencia();
      this.aviso.set('Oferta consultada no servidor.');
      // A consulta explícita substitui o rascunho pela versão confirmada do servidor.
      this.salvo.emit(this.grupoRascunho());
    } catch (error) {
      if (!this.destruido && geracao === this.geracao) this.erro.set(mensagemErro(error));
    } finally {
      if (!this.destruido && geracao === this.geracao) {
        this.ocupado.set(false);
        this.bloqueio.emit(this.incerto());
      }
    }
  }

  alterar(campos: Partial<Oferta>): void {
    const atual = this.oferta();
    if (atual && !this.ocupado() && !this.incerto() && !this.bloqueado)
      this.oferta.set({ ...atual, ...campos });
  }

  habilitar(canal: Canal, habilitado: boolean): void {
    const atual = this.oferta();
    if (atual)
      this.alterar({
        canais: habilitado
          ? [...atual.canais, canal]
          : atual.canais.filter((item) => item !== canal),
      });
  }

  async salvar(event: Event): Promise<void> {
    event.preventDefault();
    const atual = this.oferta();
    const pessoa = this.sessao.identidade();
    if (
      !atual ||
      !pessoa ||
      !this.podeAlterar ||
      this.ocupado() ||
      this.incerto() ||
      this.bloqueado
    )
      return;
    const estado = this.pendencias.daConta(pessoa.usuarioId);
    estado.set({ tipo: 'oferta', novo: false, dados: structuredClone(atual) });
    this.ocupado.set(true);
    this.bloqueio.emit(true);
    this.erro.set('');
    this.aviso.set('');
    try {
      const oferta = await this.sessao.api<Oferta>(this.rota(), 'PUT', {
        versao: atual.versao,
        preco: atual.preco,
        disponivel: atual.disponivel,
        canais: atual.canais,
      });
      estado.set(null);
      if (this.destruido) return;
      this.oferta.set(oferta);
      this.ofertaConfirmada.emit(oferta);
      this.aviso.set('Oferta da unidade salva no servidor.');
      this.salvo.emit(this.grupoRascunho());
    } catch (error) {
      const incerto = !(
        error instanceof ApiFailure &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 409
      );
      if (!incerto) estado.set(null);
      if (this.destruido) return;
      this.incerto.set(incerto);
      this.erro.set(mensagemErro(error));
    } finally {
      if (!this.destruido) {
        this.ocupado.set(false);
        this.bloqueio.emit(this.incerto());
      }
    }
  }

  grupoRascunho(): string {
    return 'oferta-' + this.produtoId + '-' + this.unidadeId();
  }

  private rota(): string {
    return '/api/v1/gestao/catalogo/produtos/' + this.produtoId + '/unidades/' + this.unidadeId();
  }

  private limparPendencia(): void {
    const pessoa = this.sessao.identidade();
    if (pessoa) {
      const estado = this.pendencias.daConta(pessoa.usuarioId);
      if (estado()?.tipo === 'oferta') estado.set(null);
    }
  }
}
