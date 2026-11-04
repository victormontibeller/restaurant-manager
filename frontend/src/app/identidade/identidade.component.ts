import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { SessaoService } from './sessao.service';
import { AcessosComponent } from '../acessos/acessos.component';
import { UnidadesComponent } from '../unidades/unidades.component';
import { CriacaoPendenteService } from '../unidades/criacao-pendente.service';
import { RecuperacaoComponent } from './recuperacao.component';
import { CadastroComponent } from './cadastro.component';

@Component({
  selector:'app-identidade',
  imports:[AcessosComponent,UnidadesComponent,RecuperacaoComponent,CadastroComponent],
  template:`
    <section [attr.aria-labelledby]="!sessao.identidade()&&cadastro()?'cadastro-titulo':recuperacao()&&!sessao.identidade()?'recuperacao-titulo':'conta-titulo'" [attr.aria-busy]="ocupado()">
      @if (sessao.identidade(); as pessoa) {
        <h2 id="conta-titulo">Minha conta</h2>
        <p>Perfil: {{ pessoa.perfil }}</p>
        <p>{{ pessoa.emailVerificado ? 'E-mail verificado.' : 'E-mail ainda não verificado.' }}</p>
        <p>Acesso empresarial autenticado. Operação e convites ainda estão em desenvolvimento.</p>
        <button type="button" (click)="sair()" [disabled]="ocupado()">Sair da conta</button>
        @if(pessoa.perfil==='ADMINISTRADOR'){
          <nav aria-label="Configurações da empresa">
            <button type="button" (click)="configuracao.set('acessos')" [disabled]="configuracaoBloqueada()" [attr.aria-pressed]="configuracao()==='acessos'">Gerenciar acessos</button>
            <button type="button" (click)="configuracao.set('unidades')" [disabled]="configuracaoBloqueada()" [attr.aria-pressed]="configuracao()==='unidades'">Gerenciar unidades</button>
          </nav>
          @if(configuracao()==='acessos'){<app-acessos (bloqueio)="configuracaoBloqueada.set($event)" />} @else {<app-unidades (bloqueio)="configuracaoBloqueada.set($event)" />}
        }
      } @else if(cadastro()) {
        <app-cadastro (voltar)="voltarAoLogin()" />
      } @else if(recuperacao()) {
        <app-recuperacao (voltar)="voltarAoLogin()" />
      } @else {
        <h2 id="conta-titulo">Acessar minha conta</h2>
        <p>Use somente contas fictícias desta empresa. Você pode criar uma conta de cliente verificando seu e-mail pela captura privada.</p>
        <form (submit)="entrar($event, email.value, senha)">
          <label for="email-conta">E-mail</label>
          <input #email id="email-conta" name="email" type="email" autocomplete="username" required maxlength="254" [disabled]="ocupado()">
          <label for="senha-conta">Senha</label>
          <input #senha id="senha-conta" name="senha" type="password" autocomplete="current-password" required maxlength="72" [disabled]="ocupado()">
          <button type="submit" [disabled]="ocupado()||encerramentoPendente()">{{ ocupado() ? 'Aguarde…' : 'Entrar' }}</button>
        </form>
        <button type="button" (click)="recuperacao.set(true);erro.set('');aviso.set('')" [disabled]="ocupado()||encerramentoPendente()">Recuperar senha</button>
        <button type="button" (click)="cadastro.set(true);erro.set('');aviso.set('')" [disabled]="ocupado()||encerramentoPendente()">Criar conta de cliente</button>
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
  private readonly pendencias = inject(CriacaoPendenteService);
  readonly ocupado = signal(true);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly encerramentoPendente = signal(false);
  readonly recuperacao = signal(false);
  readonly cadastro = signal(false);
  readonly configuracao = signal<'acessos'|'unidades'>('acessos');
  readonly configuracaoBloqueada = signal(false);
  @ViewChild('alerta') alerta?: ElementRef<HTMLElement>;
  constructor() { void this.restaurar(); }
  private async restaurar(): Promise<void> {
    try { await this.sessao.restaurar(); this.prepararConta(); }
    catch { this.aviso.set('Não foi possível restaurar a sessão. Confira a conexão e entre novamente.'); }
    finally { this.ocupado.set(false); }
  }
  async entrar(event: Event, email: string, password: HTMLInputElement): Promise<void> {
    event.preventDefault(); if (this.ocupado()||this.encerramentoPendente()) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    const senha = password.value;
    try { await this.sessao.entrar(email, senha); this.prepararConta(); password.value=''; }
    catch (error) { this.falha(error); }
    finally { this.ocupado.set(false); }
  }
  async sair(): Promise<void> {
    if (this.ocupado()) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    try { await this.sessao.sair(); this.configuracaoBloqueada.set(false); this.encerramentoPendente.set(false); this.aviso.set('Sessão encerrada no servidor.'); }
    catch { this.encerramentoPendente.set(true); this.falha(new Error('Acesso local removido, mas o encerramento no servidor não foi confirmado. Reconecte para encerrar a sessão.')); }
    finally { this.ocupado.set(false); }
  }
  private prepararConta():void {
    const pessoa=this.sessao.identidade();
    const pendente=!!(pessoa&&this.pendencias.daConta(pessoa.usuarioId)());
    this.configuracaoBloqueada.set(pendente);this.configuracao.set(pendente?'unidades':'acessos');
  }
  voltarAoLogin():void {
    this.recuperacao.set(false);
    this.cadastro.set(false);
    setTimeout(()=>document.getElementById('email-conta')?.focus());
  }
  private falha(error: unknown): void {
    this.erro.set(error instanceof Error && error.name !== 'TypeError' && error.name !== 'TimeoutError' ? error.message : 'Sem conexão com o sistema. Nenhuma operação foi confirmada.');
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}
