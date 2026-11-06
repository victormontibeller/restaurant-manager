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
import { CatalogoPendenteService } from './catalogo-pendente.service';
import { CANAIS, Canal, Oferta, Unidade, mensagemErro } from './modelos';

@Component({
  selector: 'app-oferta-unidade',
  template: `
    <section aria-labelledby="oferta-titulo" [attr.aria-busy]="ocupado()">
      <h3 id="oferta-titulo">Preço e disponibilidade de {{ nome }}</h3>
      <label for="oferta-unidade">Unidade da oferta</label>
      <select
        #unidade
        id="oferta-unidade"
        [value]="unidadeId()"
        [disabled]="ocupado() || incerto() || bloqueado"
        (change)="selecionarUnidade(unidade.value)"
      >
        <option value="">Selecione a unidade</option>
        @for (item of unidades; track item.id) {
          <option [value]="item.id" [selected]="item.id === unidadeId()">{{ item.nome }}</option>
        }
      </select>
      @if (erro()) {
        <p role="alert" class="erro">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p role="status">{{ aviso() }}</p>
      }
      @if (incerto()) {
        <p class="aviso">
          Consulte a oferta para conferir o resultado antes de editar novamente. A consulta substitui o
          rascunho.
        </p>
      }
      @if (unidadeId()) {
        <button
          class="secundario"
          type="button"
          (click)="consultar()"
          [disabled]="ocupado() || bloqueado"
        >
          Consultar oferta no servidor
        </button>
      }
      @if (oferta(); as atual) {
        <form (submit)="salvar($event)">
          <fieldset [disabled]="ocupado() || incerto() || bloqueado || !podeAlterar" class="campos">
            <legend>Oferta desta unidade</legend>
            <p>
              Esta alteração afeta somente a unidade selecionada. O horário de atendimento também
              controla a disponibilidade para o carrinho.
            </p>
            <label for="oferta-preco">Preço base nesta unidade (R$)</label>
            <input
              #preco
              id="oferta-preco"
              type="number"
              required
              min="0"
              max="999999.99"
              step="0.01"
              [value]="atual.preco"
              (input)="alterar({ preco: preco.value })"
            />
            <label class="check"
              ><input
                #disponivel
                type="checkbox"
                [checked]="atual.disponivel"
                (change)="alterar({ disponivel: disponivel.checked })"
              />Disponível nesta unidade</label
            >
            <fieldset>
              <legend>Canais desta oferta</legend>
              @for (canal of canais; track canal.valor) {
                <label class="check"
                  ><input
                    #habilitado
                    type="checkbox"
                    [checked]="atual.canais.includes(canal.valor)"
                    (change)="habilitar(canal.valor, habilitado.checked)"
                  />{{ canal.nome }}</label
                >
              }
            </fieldset>
            <button>Salvar oferta da unidade</button>
          </fieldset>
          @if (!podeAlterar) {
            <p>Seu acesso permite consultar esta oferta, sem alterá-la.</p>
          }
        </form>
      }
    </section>
  `,
  styleUrl: './catalogo.css',
})
export class OfertaUnidadeComponent implements OnChanges {
  @Input({ required: true }) produtoId = '';
  @Input() nome = '';
  @Input() unidades: Unidade[] = [];
  @Input() podeAlterar = false;
  @Input() bloqueado = false;
  @Output() bloqueio = new EventEmitter<boolean>();
  private readonly sessao = inject(SessaoService);
  private readonly pendencias = inject(CatalogoPendenteService);
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
    }
  }

  async selecionarUnidade(id: string): Promise<void> {
    if (this.ocupado() || this.incerto() || this.bloqueado) return;
    this.unidadeId.set(id);
    this.oferta.set(null);
    if (id) await this.consultar();
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
      this.aviso.set('Oferta da unidade salva no servidor.');
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
