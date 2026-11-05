import { Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { SessaoService } from './sessao.service';
import { AcessosComponent } from '../acessos/acessos.component';
import { UnidadesComponent } from '../unidades/unidades.component';
import { CriacaoPendenteService } from '../unidades/criacao-pendente.service';
import { RecuperacaoComponent } from './recuperacao.component';
import { CadastroComponent } from './cadastro.component';
import { AceitarConviteComponent } from './aceitar-convite.component';
import { ConvitesComponent } from '../acessos/convites.component';
import { ConvitePendenteService } from '../acessos/convite-pendente.service';
import { VerificacaoComponent } from './verificacao.component';
import { EventosUnidadeComponent } from '../unidades/eventos-unidade.component';

@Component({
  selector:'app-identidade',
  imports:[AcessosComponent,UnidadesComponent,RecuperacaoComponent,CadastroComponent,AceitarConviteComponent,ConvitesComponent,VerificacaoComponent,EventosUnidadeComponent],
  template:`
    <section [attr.aria-labelledby]="!sessao.identidade()&&verificacao()?'verificacao-titulo':!sessao.identidade()&&convite()?'aceitar-convite-titulo':!sessao.identidade()&&cadastro()?'cadastro-titulo':recuperacao()&&!sessao.identidade()?'recuperacao-titulo':'conta-titulo'" [attr.aria-busy]="ocupado()">
      @if (sessao.identidade(); as pessoa) {
        <h2 id="conta-titulo">Minha conta</h2>
        <p>Perfil: {{ pessoa.perfil }}</p>
        <p>{{ pessoa.emailVerificado ? 'E-mail verificado.' : 'E-mail ainda não verificado.' }}</p>
        @if(!pessoa.emailVerificado){<p>Para verificar, saia da conta e escolha Verificar e-mail existente na tela de acesso.</p>}
        <p>Acesso empresarial autenticado. As jornadas operacionais ainda estão em desenvolvimento.</p>
        <button type="button" (click)="sair()" [disabled]="ocupado()">Sair da conta</button>
        @if(pessoa.perfil!=='CLIENTE'){
          <button type="button" (click)="acompanhar.set(!acompanhar())" [attr.aria-expanded]="acompanhar()">Acompanhar atualizações da unidade</button>
          @if(acompanhar()){<app-eventos-unidade />}
        }
        @if(pessoa.perfil==='ADMINISTRADOR'){
          <nav aria-label="Configurações da empresa">
            <button type="button" (click)="configuracao.set('acessos')" [disabled]="configuracaoBloqueada()" [attr.aria-pressed]="configuracao()==='acessos'">Gerenciar acessos</button>
            <button type="button" (click)="configuracao.set('unidades')" [disabled]="configuracaoBloqueada()" [attr.aria-pressed]="configuracao()==='unidades'">Gerenciar unidades</button>
            <button type="button" (click)="configuracao.set('convites')" [disabled]="configuracaoBloqueada()" [attr.aria-pressed]="configuracao()==='convites'">Gerenciar convites</button>
          </nav>
          @if(configuracao()==='acessos'){<app-acessos (bloqueio)="configuracaoBloqueada.set($event)" />} @else if(configuracao()==='convites'){<app-convites (bloqueio)="configuracaoBloqueada.set($event)" />} @else {<app-unidades (bloqueio)="configuracaoBloqueada.set($event)" />}
        }
      } @else if(verificacao()) {
        <app-verificacao (voltar)="voltarAoLogin()" />
      } @else if(convite()) {
        <app-aceitar-convite (voltar)="voltarAoLogin()" />
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
        <nav class="jornadas" aria-label="Acesso à conta">
          <button type="button" (click)="abrirFormulario('recuperacao')" [disabled]="ocupado()||encerramentoPendente()">Recuperar senha</button>
          <button type="button" (click)="abrirFormulario('cadastro')" [disabled]="ocupado()||encerramentoPendente()">Criar conta de cliente</button>
          <button type="button" (click)="abrirFormulario('convite')" [disabled]="ocupado()||encerramentoPendente()">Aceitar convite de funcionário</button>
          <button type="button" (click)="abrirFormulario('verificacao')" [disabled]="ocupado()||encerramentoPendente()">Verificar e-mail existente</button>
        </nav>
      }
      @if (erro()) { <p #alerta class="erro" role="alert" tabindex="-1">{{ erro() }}</p> }
      @if (encerramentoPendente()) { <button type="button" (click)="sair()" [disabled]="ocupado()">Tentar encerrar novamente</button> }
      @if (aviso()) { <p aria-live="polite">{{ aviso() }}</p> }
    </section>
  `,
  styles:`form{display:grid;gap:.5rem;max-width:28rem}input{width:100%;min-height:48px;border:1px solid #6b7a70;border-radius:.4rem;padding:.6rem;font:inherit}label{font-weight:650}form button{margin-top:.7rem}.jornadas{display:flex;flex-wrap:wrap;gap:.5rem;margin-top:.5rem}.erro{color:#9d2424;font-weight:600}`,
})
export class IdentidadeComponent {
  readonly sessao = inject(SessaoService);
  private readonly elemento:ElementRef<HTMLElement>=inject(ElementRef);
  private readonly pendencias = inject(CriacaoPendenteService);
  private readonly convitesPendentes = inject(ConvitePendenteService);
  readonly ocupado = signal(true);
  readonly erro = signal('');
  readonly aviso = signal('');
  readonly encerramentoPendente = signal(false);
  readonly recuperacao = signal(false);
  readonly cadastro = signal(false);
  readonly convite = signal(false);
  readonly verificacao = signal(false);
  readonly acompanhar = signal(false);
  readonly configuracao = signal<'acessos'|'unidades'|'convites'>('acessos');
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
    this.acompanhar.set(false);
    const pessoa=this.sessao.identidade();
    const pendente=!!(pessoa&&this.pendencias.daConta(pessoa.usuarioId)());
    const convite=!!(pessoa&&this.convitesPendentes.daConta(pessoa.usuarioId)());
    this.configuracaoBloqueada.set(pendente||convite);this.configuracao.set(pendente?'unidades':convite?'convites':'acessos');
  }
  abrirFormulario(area:'recuperacao'|'cadastro'|'convite'|'verificacao'):void {
    if(this.ocupado()||this.encerramentoPendente())return;
    this[area].set(true);this.erro.set('');this.aviso.set('');
    const titulo=area==='convite'?'aceitar-convite-titulo':area+'-titulo';
    setTimeout(()=>this.elemento.nativeElement.querySelector<HTMLElement>('#'+titulo)?.focus());
  }
  voltarAoLogin():void {
    this.recuperacao.set(false);
    this.cadastro.set(false);
    this.convite.set(false);
    this.verificacao.set(false);
    setTimeout(()=>document.getElementById('email-conta')?.focus());
  }
  private falha(error: unknown): void {
    this.erro.set(error instanceof Error && error.name !== 'TypeError' && error.name !== 'TimeoutError' ? error.message : 'Sem conexão com o sistema. Nenhuma operação foi confirmada.');
    setTimeout(() => this.alerta?.nativeElement.focus());
  }
}
