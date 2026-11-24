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
import { mensagemErro } from '../catalogo/modelos';
import { FormularioRotaDirective } from '../rotas/formulario-rota.directive';
import { SessaoService } from '../identidade/sessao.service';
import { HlmButton } from '../ui/button';

interface PrazosAceite {
  versao: number;
  alertaSegundos: number;
  expiracaoSegundos: number;
  herdado: boolean;
}

@Component({
  selector: 'app-prazos-aceite',
  imports: [HlmButton],
  templateUrl: './prazos-aceite.component.html',
  styleUrls: ['../ui/administracao.css', './prazos-aceite.component.css'],
})
export class PrazosAceiteComponent {
  readonly unidadeId = input.required<string>();
  readonly salvo = output<void>();
  readonly bloqueio = output<boolean>();
  private readonly formulario = inject(FormularioRotaDirective, { optional: true });
  private readonly sessao = inject(SessaoService);
  readonly atual = signal<PrazosAceite | null>(null);
  readonly empresa = signal(false);
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly aviso = signal('');
  alertaSegundos = '120';
  expiracaoSegundos = '300';
  herdado = true;
  private geracao = 0;

  constructor() {
    effect(() => this.bloqueio.emit(this.ocupado()));
    effect(() => {
      this.unidadeId();
      this.geracao++;
      this.ocupado.set(false);
      untracked(() => void this.carregar());
    });
    inject(DestroyRef).onDestroy(() => this.geracao++);
  }

  trocarEscopo(select: HTMLSelectElement): void {
    if (this.ocupado() || this.formulario?.confirmarDescarte('prazos') === false) {
      select.value = this.empresa() ? 'empresa' : 'unidade';
      return;
    }
    this.empresa.set(select.value === 'empresa');
    this.atual.set(null);
    this.aviso.set('');
    void this.carregar();
  }

  reconsultar(): void {
    if (this.ocupado() || this.formulario?.confirmarDescarte('prazos') === false) return;
    this.atual.set(null);
    this.aviso.set('');
    void this.carregar();
  }

  private rota(): string {
    return this.empresa()
      ? '/api/v1/configuracoes/prazos-aceite'
      : '/api/v1/configuracoes/unidades/' + this.unidadeId() + '/prazos-aceite';
  }

  async carregar(): Promise<void> {
    if (this.ocupado()) return;
    const geracao = this.geracao;
    this.ocupado.set(true);
    this.erro.set('');
    try {
      const prazos = await this.sessao.api<PrazosAceite>(this.rota());
      if (geracao === this.geracao) this.preencher(prazos);
    } catch (error) {
      if (geracao === this.geracao) this.erro.set(mensagemErro(error));
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }

  async salvar(event: Event, senha: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (!this.atual() || this.ocupado()) return;
    const alertaSegundos = Number(this.alertaSegundos);
    const expiracaoSegundos = Number(this.expiracaoSegundos);
    if (
      ![alertaSegundos, expiracaoSegundos].every(Number.isInteger) ||
      alertaSegundos <= 0 ||
      alertaSegundos >= expiracaoSegundos ||
      expiracaoSegundos > 86400
    ) {
      this.erro.set('Informe um alerta positivo, anterior ao cancelamento, limitado a 24 horas.');
      return;
    }
    const geracao = this.geracao;
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    const valor = senha.value;
    senha.value = '';
    try {
      await this.sessao.api('/api/v1/auth/reautenticar', 'POST', { senha: valor });
      const prazos = await this.sessao.api<PrazosAceite>(this.rota(), 'PUT', {
        versao: this.atual()!.versao,
        alertaSegundos,
        expiracaoSegundos,
        herdar: !this.empresa() && this.herdado,
      });
      if (geracao !== this.geracao) return;
      this.preencher(prazos);
      this.aviso.set('Prazos salvos para futuros pedidos.');
      this.salvo.emit();
    } catch (error) {
      if (geracao === this.geracao)
        this.erro.set(mensagemErro(error) + ' Consulte os prazos atuais antes de repetir.');
    } finally {
      if (geracao === this.geracao) this.ocupado.set(false);
    }
  }

  private preencher(prazos: PrazosAceite): void {
    this.atual.set(prazos);
    this.alertaSegundos = String(prazos.alertaSegundos);
    this.expiracaoSegundos = String(prazos.expiracaoSegundos);
    this.herdado = prazos.herdado;
  }

  trocarEscopoValor(escopo: 'unidade' | 'empresa'): void {
    if (this.ocupado()) return;
    this.empresa.set(escopo === 'empresa');
    void this.carregar();
  }

  camposBloqueados(): boolean {
    return this.ocupado() || (!this.empresa() && this.herdado);
  }

  aplicarPreset(alerta: number, expiracao: number): void {
    if (this.camposBloqueados()) return;
    this.alertaSegundos = String(alerta);
    this.expiracaoSegundos = String(expiracao);
  }

  formatarDuracao(valor: string | number): string {
    const s = Number(valor);
    if (!Number.isFinite(s) || s <= 0) return '—';
    if (s < 60) return `${Math.floor(s)} s`;
    const min = Math.floor(s / 60);
    const resto = Math.floor(s % 60);
    return resto ? `${min} min ${resto} s` : `${min} min`;
  }

  percentualAlertaSla(): number {
    const a = Number(this.alertaSegundos);
    const e = Number(this.expiracaoSegundos);
    if (!Number.isFinite(a) || !Number.isFinite(e) || a <= 0 || e <= a) return 40;
    return Math.min(85, Math.max(15, Math.round((a / e) * 100)));
  }

  erroInlineSla(): boolean {
    if (this.camposBloqueados()) return false;
    const a = Number(this.alertaSegundos);
    const e = Number(this.expiracaoSegundos);
    return !Number.isInteger(a) || !Number.isInteger(e) || a <= 0 || a >= e || e > 86400;
  }
}
