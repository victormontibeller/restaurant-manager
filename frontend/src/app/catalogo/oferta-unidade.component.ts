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
import { HlmButton } from '../ui/button';
import { CatalogoPendenteService } from './catalogo-pendente.service';
import { CANAIS, Canal, Oferta, Unidade, mensagemErro } from './modelos';

@Component({
  selector: 'app-oferta-unidade',
  imports: [HlmButton],
  template: `
    <section class="gc-form" aria-labelledby="oferta-titulo" [attr.aria-busy]="ocupado()">
      <h3 id="oferta-titulo" class="gc-editor-titulo">Preço e disponibilidade de {{ nome }}</h3>

      <div class="gc-grid-2" style="align-items: end">
        <div class="gc-field">
          <label for="oferta-unidade">Unidade da oferta</label>
          <div
            class="bistro-select-wrap"
            (focusout)="
              !$any($event.currentTarget).contains($event.relatedTarget) &&
                (menuOfertaUnidade.checked = false)
            "
          >
            <input #menuOfertaUnidade type="checkbox" hidden />
            <div
              class="bistro-select-pill"
              [class.open]="menuOfertaUnidade.checked"
              [class.disabled]="ocupado() || incerto() || bloqueado"
              (mousedown)="!(ocupado() || incerto() || bloqueado) && $event.preventDefault()"
              (click)="
                !(ocupado() || incerto() || bloqueado) && unidade.focus();
                !(ocupado() || incerto() || bloqueado) &&
                  (menuOfertaUnidade.checked = !menuOfertaUnidade.checked)
              "
            >
              <svg
                class="bistro-select-ico"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 21s-6.5-5.6-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.4 12 21 12 21z" />
                <circle cx="12" cy="10.5" r="2.3" />
              </svg>
              <span class="bistro-select-val" aria-hidden="true">
                {{ nomeUnidadeSelecionada() || 'Selecione a unidade' }}
              </span>
              <select
                #unidade
                id="oferta-unidade"
                class="bistro-select-native"
                data-sem-rascunho
                [value]="unidadeId()"
                [disabled]="ocupado() || incerto() || bloqueado"
                (keydown.enter)="
                  $event.preventDefault();
                  !(ocupado() || incerto() || bloqueado) &&
                    (menuOfertaUnidade.checked = !menuOfertaUnidade.checked)
                "
                (keydown.space)="
                  $event.preventDefault();
                  !(ocupado() || incerto() || bloqueado) &&
                    (menuOfertaUnidade.checked = !menuOfertaUnidade.checked)
                "
                (keydown.escape)="menuOfertaUnidade.checked = false"
                (change)="menuOfertaUnidade.checked = false; selecionarUnidade(unidade.value)"
              >
                <option value="">Selecione a unidade</option>
                @for (item of unidades; track item.id) {
                  <option [value]="item.id" [selected]="item.id === unidadeId()">
                    {{ item.nome }}
                  </option>
                }
              </select>
              <svg
                class="bistro-select-chev"
                [class.rot]="menuOfertaUnidade.checked"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.4"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
            @if (menuOfertaUnidade.checked && !(ocupado() || incerto() || bloqueado)) {
              <div class="bistro-select-popover" role="presentation">
                <p class="bistro-select-popover-title">Unidades</p>
                @for (item of unidades; track item.id) {
                  <button
                    type="button"
                    class="bistro-select-opt"
                    [class.on]="item.id === unidadeId()"
                    tabindex="-1"
                    (mousedown)="$event.preventDefault()"
                    (click)="
                      menuOfertaUnidade.checked = false;
                      unidade.value = item.id;
                      selecionarUnidade(item.id);
                      unidade.focus()
                    "
                  >
                    <span class="bistro-select-opt-main">
                      <span>{{ item.nome }}</span>
                    </span>
                    @if (item.id === unidadeId()) {
                      <span class="bistro-select-opt-check" aria-hidden="true">
                        <svg width="15" height="15" viewBox="0 0 24 24">
                          <path
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.8"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            d="m5 12.5 4.5 4.5L19 7.5"
                          />
                        </svg>
                      </span>
                    }
                  </button>
                }
              </div>
            }
          </div>
        </div>

        @if (unidadeId()) {
          <button
            hlmBtn
            variant="outline"
            type="button"
            (click)="consultar()"
            [disabled]="ocupado() || bloqueado"
          >
            Consultar oferta <span class="sr-only">no servidor</span>
          </button>
        }
      </div>

      @if (erro()) {
        <p role="alert" class="gc-callout-danger">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p role="status" class="gc-callout-ok">{{ aviso() }}</p>
      }
      @if (incerto()) {
        <p class="gc-callout-amber">
          Consulte a oferta para conferir o resultado antes de editar novamente. A consulta
          substitui o rascunho.
        </p>
      }

      @if (oferta(); as atual) {
        <form class="gc-form" [attr.data-rascunho]="grupoRascunho()" (submit)="salvar($event)">
          <fieldset
            [disabled]="ocupado() || incerto() || bloqueado || !podeAlterar"
            class="gc-fieldset-flat"
          >
            <legend>Oferta desta unidade</legend>
            <p class="gc-nota">
              Esta alteração afeta somente a unidade selecionada. O horário de atendimento também
              controla a disponibilidade para o carrinho.
            </p>

            <div class="gc-grid-2" style="align-items: end">
              <div class="gc-field">
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
              </div>

              <label class="gc-tactile-switch" [class.checked]="atual.disponivel">
                <input
                  #disponivel
                  type="checkbox"
                  [checked]="atual.disponivel"
                  (change)="alterar({ disponivel: disponivel.checked })"
                />
                <span>Disponível nesta unidade</span>
              </label>
            </div>

            <fieldset class="gc-fieldset-flat">
              <legend>Canais desta oferta</legend>
              <div class="gc-chips-wrap">
                @for (canal of canais; track canal.valor) {
                  <label
                    class="gc-check-chip"
                    [class.on]="atual.canais.includes(canal.valor)"
                  >
                    <input
                      #habilitado
                      type="checkbox"
                      [checked]="atual.canais.includes(canal.valor)"
                      (change)="habilitar(canal.valor, habilitado.checked)"
                    />
                    <span>{{ canal.nome }}</span>
                  </label>
                }
              </div>
            </fieldset>

            <div class="gc-acoes-rodape">
              <button hlmBtn type="submit">Salvar oferta da unidade</button>
            </div>
          </fieldset>
          @if (!podeAlterar) {
            <p class="gc-nota">Seu acesso permite consultar esta oferta, sem alterá-la.</p>
          }
        </form>
      }
    </section>
  `,
  styleUrls: ['./catalogo.css', './gestao-catalogo.css'],
})
export class OfertaUnidadeComponent implements OnChanges {
  @Input({ required: true }) produtoId = '';
  @Input() nome = '';
  @Input() unidades: Unidade[] = [];
  @Input() podeAlterar = false;
  @Input() bloqueado = false;
  @Output() bloqueio = new EventEmitter<boolean>();
  @Output() salvo = new EventEmitter<string>();
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

  nomeUnidadeSelecionada(): string {
    return this.unidades.find((u) => u.id === this.unidadeId())?.nome ?? '';
  }
}
