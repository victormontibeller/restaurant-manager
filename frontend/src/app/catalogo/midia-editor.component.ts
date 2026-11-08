import {
  Component,
  DestroyRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  WritableSignal,
  inject,
  signal,
} from '@angular/core';
import { ApiFailure, SessaoService } from '../identidade/sessao.service';
import { Midia, Produto, mensagemErro } from './modelos';
import { EnvioMidiaPendente, MidiaPendenteService } from './midia-pendente.service';

@Component({
  selector: 'app-midia-editor',
  template: `
    <fieldset [attr.data-rascunho]="'midia-' + produto.id" [disabled]="bloqueado || ocupado()" aria-label="Imagem do produto">
      <legend>Imagem do produto</legend>
      @if (midiaId) {
        <img class="previa" [src]="'/api/v1/midias/' + midiaId" alt="Imagem atual do produto" />
      }
      <p>
        Envie uma imagem JPEG ou PNG de até 5 MiB, com até 4096 pixels por lado e 12 milhões de pixels
        no total. O servidor publica uma cópia de até 1280 pixels por lado, sem metadados. A imagem só
        será associada após salvar o produto.
      </p>
      <label for="produto-imagem">Arquivo da imagem</label>
      <input
        #arquivo
        id="produto-imagem"
        type="file"
        accept="image/jpeg,image/png"
        [disabled]="incerto() || temPendencia()"
        (change)="selecionar(arquivo)"
      />
      <div class="acoes">
        <button type="button" (click)="enviar()" [disabled]="!selecionado || incerto()">
          Enviar imagem
        </button>
        @if (incerto()) {
          <button type="button" (click)="consultar()">Consultar envio da imagem</button>
        }
        @if (midiaId && !incerto()) {
          <button class="secundario" type="button" (click)="midiaIdChange.emit(null)">
            Remover imagem do produto
          </button>
        }
      </div>
      @if (erro()) {
        <p role="alert" class="erro">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p role="status">{{ aviso() }}</p>
      }
    </fieldset>
  `,
  styleUrl: './catalogo.css',
})
export class MidiaEditorComponent implements OnChanges {
  @Input({ required: true }) produto!: Produto;
  @Input() novo = false;
  @Input() midiaId: string | null = null;
  @Input() bloqueado = false;
  @Output() midiaIdChange = new EventEmitter<string | null>();
  @Output() bloqueio = new EventEmitter<boolean>();
  @Output() salvo = new EventEmitter<string>();
  private readonly sessao = inject(SessaoService);
  private readonly pendencias = inject(MidiaPendenteService);
  private estado: WritableSignal<EnvioMidiaPendente | null> | null = null;
  private destruido = false;
  readonly ocupado = signal(false);
  readonly incerto = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  selecionado: File | null = null;
  private envioId: string | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      this.destruido = true;
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    const produto = changes['produto'];
    if (!produto || produto.previousValue?.id === produto.currentValue?.id) return;
    const pessoa = this.sessao.identidade();
    this.estado = pessoa ? this.pendencias.daConta(pessoa.usuarioId) : null;
    const pendente = this.estado?.();
    this.selecionado = pendente?.arquivo ?? null;
    this.envioId = pendente?.id ?? null;
    this.incerto.set(!!pendente);
    this.erro.set('');
    this.aviso.set(
      pendente
        ? 'O envio anterior desta conta foi preservado. Consulte seu resultado antes de continuar.'
        : '',
    );
    if (pendente) this.bloqueio.emit(true);
  }

  temPendencia(): boolean {
    return !!this.estado?.();
  }

  selecionar(input: HTMLInputElement): void {
    if (this.bloqueado || this.ocupado() || this.incerto() || this.temPendencia()) return;
    this.selecionado = input.files?.[0] ?? null;
    this.envioId = null;
    this.erro.set('');
    this.aviso.set('');
  }

  async enviar(): Promise<void> {
    if (!this.selecionado || !this.estado || this.bloqueado || this.ocupado() || this.incerto())
      return;
    this.envioId ??= crypto.randomUUID();
    const estado = this.estado;
    const envioId = this.envioId;
    const intencao = {
      id: envioId,
      arquivo: this.selecionado,
      produto: structuredClone(this.produto),
      novo: this.novo,
    };
    estado.set(intencao);
    const body = new FormData();
    body.append('arquivo', this.selecionado);
    this.iniciar();
    try {
      this.concluir(await this.sessao.upload<Midia>('/api/v1/gestao/midias/' + this.envioId, body));
    } catch (error) {
      const incerto = !(
        error instanceof ApiFailure &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 409
      );
      if (!incerto && estado() === intencao) estado.set(null);
      if (this.destruido) return;
      this.incerto.set(incerto);
      this.erro.set(mensagemErro(error));
      if (this.incerto())
        this.aviso.set(
          'O envio pode ter sido concluído. Consulte seu resultado antes de enviar outra imagem.',
        );
    } finally {
      this.finalizar();
    }
  }

  async consultar(): Promise<void> {
    if (!this.envioId || this.bloqueado || this.ocupado()) return;
    this.iniciar();
    try {
      this.concluir(await this.sessao.api<Midia>('/api/v1/gestao/midias/' + this.envioId));
    } catch (error) {
      if (this.destruido) return;
      if (error instanceof ApiFailure && error.status === 404) {
        this.incerto.set(false);
        this.aviso.set(
          'O servidor não encontrou este envio. Você pode enviar novamente o mesmo arquivo.',
        );
      } else this.erro.set(mensagemErro(error));
    } finally {
      this.finalizar();
    }
  }

  private iniciar(): void {
    this.ocupado.set(true);
    this.bloqueio.emit(true);
    this.erro.set('');
    this.aviso.set('');
  }

  private concluir(midia: Midia): void {
    if (this.destruido) return;
    this.midiaIdChange.emit(midia.id);
    if (this.estado?.()?.id === midia.id) this.estado.set(null);
    this.incerto.set(false);
    this.aviso.set('Imagem validada. Salve o produto para associá-la ao catálogo.');
    this.salvo.emit('midia-' + this.produto.id);
  }

  private finalizar(): void {
    if (this.destruido) return;
    this.ocupado.set(false);
    this.bloqueio.emit(this.incerto() || this.temPendencia());
  }
}
