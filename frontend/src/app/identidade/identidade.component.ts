import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { SessaoService } from './sessao.service';
import { AcessosComponent } from '../acessos/acessos.component';

@Component({
  selector:'app-identidade',
  imports:[AcessosComponent],
  template:`
    <section aria-labelledby="conta-titulo" [attr.aria-busy]="ocupado()">
      @if (sessao.identidade(); as pessoa) {
        <h2 id="conta-titulo">Minha conta</h2>
        <p>Perfil: {{ pessoa.perfil }}</p>
        <p>Acesso empresarial autenticado. Operação e convites ainda estão em desenvolvimento.</p>
        <button type="button" (click)="sair()" [disabled]="ocupado()">Sair da conta</button>
        @if(pessoa.perfil==='ADMINISTRADOR'){<app-acessos />}
      } @else {
        <h2 id="conta-titulo">Acessar minha conta</h2>
        <p>Use somente uma conta fictícia provisionada nesta empresa. Cadastro e recuperação ainda não estão disponíveis.</p>
        <form (submit)="entrar($event, email.value, senha)">
          <label for="email-conta">E-mail</label>
          <input #email id="email-conta" name="email" type="email" autocomplete="username" required maxlength="254" [disabled]="ocupado()">
          <label for="senha-conta">Senha</label>
          <input #senha id="senha-conta" name="senha" type="password" autocomplete="current-password" required maxlength="72" [disabled]="ocupado()">
          <button type="submit" [disabled]="ocupado()">{{ ocupado() ? 'Aguarde…' : 'Entrar' }}</button>
        </form>
      }
      @if (erro()) { <p #alerta class="erro" role="alert" tabindex="-1">{{ erro() }}</p> }
      @if (encerramentoPendente()) { <button type="button" (click)="sair()" [disabled]="ocupado()">Tentar encerrar novamente</button> }
      @if (aviso()) { <p aria-live="polite">{{ aviso() }}</p> }
    </section>
  `,
  styles:`form{display:grid;gap:.5rem;max-width:28rem}input{width:100%;min-height:48px;border:1px solid #6b7a70;border-radius:.4rem;padding:.6rem;font:inherit}label{font-weight:650}form button{margin-top:.7rem}.erro{color:#9d2424;font-weight:600}`,
})
export class IdentidadeComponent {
  readonly sessao = inject(SessaoService);
  readonly ocupado = signal(true);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly encerramentoPendente = signal(false);
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  constructor() { void this.restaurar(); }
  private async restaurar(): Promise<void> {
    try { await this.sessao.restaurar(); }
    catch { this.aviso.set('Não foi possível restaurar a sessão. Confira a conexão e entre novamente.'); }
    finally { this.ocupado.set(false); }
  }
  async entrar(event: Event, email: string, password: HTMLInputElement): Promise<void> {
    event.preventDefault(); if (this.ocupado()) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    const senha = password.value;
    try { await this.sessao.entrar(email, senha); password.value=''; }
    catch (error) { this.falha(error); }
    finally { this.ocupado.set(false); }
  }
  async sair(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    try { await this.sessao.sair(); this.encerramentoPendente.set(false); this.aviso.set('Sessão encerrada no servidor.'); }
    catch { this.encerramentoPendente.set(true); this.falha(new Error('Acesso local removido, mas o encerramento no servidor não foi confirmado. Reconecte para encerrar a sessão.')); }
    finally { this.ocupado.set(false); }
  }
  private falha(error: unknown): void {
    this.erro.set(error instanceof Error && error.name !== 'TypeError' && error.name !== 'TimeoutError' ? error.message : 'Sem conexão com o sistema. Nenhuma operação foi confirmada.');
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}
