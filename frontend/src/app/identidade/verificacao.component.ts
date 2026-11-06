import { Component, ElementRef, ViewChild, inject, output, signal } from '@angular/core';
import { ApiFailure, SessaoService } from './sessao.service';

@Component({
  selector: 'app-verificacao',
  template: `
    <section aria-labelledby="verificacao-titulo" [attr.aria-busy]="ocupado()">
      <h2 id="verificacao-titulo" tabindex="-1">Verificar e-mail existente</h2>
      <p>Confirme o e-mail de uma conta já cadastrada nesta empresa. Sua senha, seu perfil e suas unidades não serão alterados.</p>
      <p>Neste ambiente fictício, as mensagens são capturadas localmente; nenhum e-mail real é enviado.</p>
      <form (submit)="solicitar($event, email.value)">
        <label for="email-verificacao">E-mail da conta existente</label>
        <input
          #email
          id="email-verificacao"
          type="email"
          autocomplete="email"
          required
          maxlength="254"
          [disabled]="ocupado()"
        >
        <button type="submit" [disabled]="ocupado()">Solicitar código de verificação</button>
      </form>
      <p>O código só funciona nesta empresa, expira em quinze minutos após a solicitação e pode ser usado uma vez.</p>
      <form (submit)="confirmar($event, codigo)">
        <label for="codigo-verificacao">Código de verificação</label>
        <input
          #codigo
          id="codigo-verificacao"
          type="password"
          autocomplete="off"
          required
          minlength="43"
          maxlength="43"
          pattern="[A-Za-z0-9_-]{43}"
          [attr.aria-describedby]="codigoInvalido() ? 'erro-verificacao' : null"
          [attr.aria-invalid]="codigoInvalido() ? true : null"
          [disabled]="ocupado()"
        >
        <button type="submit" [disabled]="ocupado()">Confirmar verificação</button>
      </form>
      @if (erro()) {
        <p #alerta id="erro-verificacao" role="alert" tabindex="-1" class="erro">{{ erro() }}</p>
      }
      @if (aviso()) {
        <p #resultado role="status" tabindex="-1">{{ aviso() }}</p>
      }
      <button type="button" (click)="voltar.emit()" [disabled]="ocupado()">Voltar ao login</button>
    </section>
  `,
  styles: `
    form {
      display: grid;
      gap: 0.5rem;
      max-width: 28rem;
      margin-bottom: 1.5rem;
    }
    input {
      width: 100%;
      min-height: 48px;
      border: 1px solid #6b7a70;
      border-radius: 0.4rem;
      padding: 0.6rem;
      font: inherit;
    }
    label {
      font-weight: 650;
    }
    .erro {
      color: #9d2424;
      font-weight: 600;
    }
  `,
})
export class VerificacaoComponent {
  private readonly sessao = inject(SessaoService);
  readonly voltar = output<void>();
  readonly ocupado = signal(false);
  readonly erro = signal('');
  readonly codigoInvalido = signal(false);
  readonly aviso = signal('');
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  @ViewChild('resultado') resultado?: ElementRef<HTMLElement>;

  async solicitar(event: Event, email: string): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.iniciar();
    try {
      await this.sessao.verificarEmail('verificacao', { email });
      this.sucesso('Se a conta estiver elegível, enviaremos instruções para verificar o e-mail.');
    } catch (error) {
      this.falha(error, false);
    } finally {
      this.ocupado.set(false);
    }
  }

  async confirmar(event: Event, codigo: HTMLInputElement): Promise<void> {
    event.preventDefault();
    if (this.ocupado()) return;
    this.iniciar();
    try {
      await this.sessao.verificarEmail('verificacao/confirmar', { codigo: codigo.value });
      codigo.value = '';
      this.sucesso('E-mail verificado. Sua senha e seu perfil foram preservados.');
    } catch (error) {
      this.falha(error, true);
    } finally {
      this.ocupado.set(false);
    }
  }

  private iniciar(): void {
    this.ocupado.set(true);
    this.erro.set('');
    this.aviso.set('');
    this.codigoInvalido.set(false);
  }

  private sucesso(texto: string): void {
    this.aviso.set(texto);
    setTimeout(() => this.resultado?.nativeElement.focus());
  }

  private falha(error: unknown, confirmacao: boolean): void {
    this.codigoInvalido.set(
      confirmacao &&
        error instanceof ApiFailure &&
        error.status === 422 &&
        error.codigo === 'VERIFICACAO_INVALIDA',
    );
    const rede =
      error instanceof TypeError ||
      (error instanceof ApiFailure && error.status >= 500) ||
      (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name));
    this.erro.set(
      rede
        ? confirmacao
          ? 'A resposta não chegou. O e-mail pode ter sido verificado. Volte ao login e confira na conta antes de solicitar outro código.'
          : 'Sem conexão. A solicitação não foi confirmada; confira a captura antes de repetir.'
        : error instanceof Error
          ? error.message
          : 'Não foi possível concluir a operação.',
    );
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}
